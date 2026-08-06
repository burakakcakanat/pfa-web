import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// -------- OVERVIEW --------
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ordersRes, productsRes, profilesRes, sessionsRes, entRes, recentRes] =
      await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("id, amount_cents, currency, status, product_id, created_at")
          .eq("status", "paid")
          .eq("is_test", false),
        supabaseAdmin.from("products").select("id, slug, name_tr, type"),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("assessment_sessions")
          .select("id, type, status, created_at"),
        supabaseAdmin.from("user_entitlements").select("id, type, metadata"),
        supabaseAdmin
          .from("orders")
          .select("id, amount_cents, currency, status, created_at, product_id, user_id")
          .eq("is_test", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const products = productsRes.data ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const paid = ordersRes.data ?? [];
    const totalRevenueCents = paid.reduce((s, o) => s + (o.amount_cents ?? 0), 0);
    const revenueByProduct: Record<string, { name: string; cents: number; count: number }> = {};
    for (const o of paid) {
      const p = o.product_id ? productMap.get(o.product_id) : undefined;
      const key = p?.slug ?? "unknown";
      revenueByProduct[key] ??= { name: p?.name_tr ?? key, cents: 0, count: 0 };
      revenueByProduct[key].cents += o.amount_cents ?? 0;
      revenueByProduct[key].count += 1;
    }

    const memberCount = profilesRes.count ?? 0;

    const cutoff = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const sessions = sessionsRes.data ?? [];
    const recent = sessions.filter((s) => s.created_at >= cutoff && s.status === "completed");
    const miniCount = recent.filter((s) => s.type === "mini").length;
    const fullCount = recent.filter((s) => s.type === "full").length;

    // Webinar registrations = paid orders per webinar product
    const webinarRegs: Array<{ slug: string; name: string; count: number }> = [];
    for (const p of products) {
      if (p.type !== "webinar" && p.slug !== "pfa-pro-lisans-paketi" && p.slug !== "bilinc-seviyeleri-calismalari") continue;
      const c = paid.filter((o) => o.product_id === p.id).length;
      webinarRegs.push({ slug: p.slug, name: p.name_tr, count: c });
    }

    const activePro = (entRes.data ?? []).filter((e) => e.type === "pfa_pro").length;
    const proEnts = (entRes.data ?? []).filter((e) => e.type === "pfa_pro");
    const totalClientQuota = proEnts.reduce((s, e) => s + (((e.metadata as any)?.client_quota) ?? 0), 0);
    const totalClientUsed = proEnts.reduce((s, e) => s + (((e.metadata as any)?.client_used) ?? 0), 0);

    const latestOrders = (recentRes.data ?? []).map((o) => ({
      ...o,
      product_name: o.product_id ? productMap.get(o.product_id)?.name_tr ?? "—" : "—",
    }));

    return {
      totalRevenueCents,
      revenueByProduct: Object.entries(revenueByProduct).map(([slug, v]) => ({ slug, ...v })),
      memberCount,
      miniCount,
      fullCount,
      webinarRegs,
      activePro,
      totalClientQuota,
      totalClientUsed,
      latestOrders,
    };
  });

// -------- PRODUCTS --------
export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name_tr: z.string().min(1).max(200).optional(),
        name_en: z.string().min(1).max(200).optional(),
        description_tr: z.string().max(4000).nullable().optional(),
        description_en: z.string().max(4000).nullable().optional(),
        price_cents: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
        activate_at: z.string().nullable().optional(),
        cover_image_url: z.string().url().nullable().optional(),
        master_pdf_path: z.string().nullable().optional(),
        master_epub_path: z.string().nullable().optional(),
        language: z.string().max(10).optional(),
        book_key: z.string().max(20).nullable().optional(),
        category: z
          .enum(["kitap", "olcme", "seans", "paket", "program", "diger"])
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- PRODUCT ASSET UPLOADS --------
// Kapak görseli: blog-images (private) bucket'ta covers/ prefix'i altında saklanır;
// public bucket engelli olduğu için uzun ömürlü signed URL üretilir.
export const createProductCoverUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: z.string().min(1).max(100), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (data.filename.split(".").pop() || "png").toLowerCase();
    const path = `book-covers/${data.slug}-${Date.now()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("blog-images")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    // ~1 yıl (Supabase üst sınır). Frontend gerekirse yenileyebilir.
    const { data: urlData, error: urlErr } = await supabaseAdmin.storage
      .from("blog-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (urlErr) throw new Error(urlErr.message);
    return { path, token: signed.token, publicUrl: urlData.signedUrl };
  });

// Master PDF/EPUB — private book-files bucket'ında ürün slug'ı altında saklanır.
export const createProductMasterUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: z.string().min(1).max(100),
        filename: z.string().min(1).max(200),
        format: z.enum(["pdf", "epub"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.format === "pdf" ? "pdf" : "epub";
    const path = `${data.slug}/master-${Date.now()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("book-files")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

// -------- BUNDLES --------
export const listAdminBundles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [bundlesRes, itemsRes, productsRes] = await Promise.all([
      supabaseAdmin.from("bundles").select("*").order("sort_order"),
      supabaseAdmin.from("bundle_items").select("bundle_id, product_slug, quantity"),
      supabaseAdmin.from("products").select("slug, name_tr, price_cents"),
    ]);
    const itemsByBundle = new Map<string, Array<{ product_slug: string; quantity: number }>>();
    for (const it of itemsRes.data ?? []) {
      const arr = itemsByBundle.get(it.bundle_id) ?? [];
      arr.push({ product_slug: it.product_slug, quantity: it.quantity ?? 1 });
      itemsByBundle.set(it.bundle_id, arr);
    }
    return {
      bundles: (bundlesRes.data ?? []).map((b) => ({ ...b, items: itemsByBundle.get(b.id) ?? [] })),
      products: productsRes.data ?? [],
    };
  });

export const upsertAdminBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        active: z.boolean().optional(),
        activate_at: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
        price_override_cents: z.number().int().min(0).nullable().optional(),
        discount_percent: z.number().int().min(0).max(100).optional(),
        name_tr: z.string().min(1).max(200).optional(),
        description_tr: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("bundles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- BOOK EDITIONS --------
export const listAdminEditions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("book_editions")
      .select("*")
      .order("book_key")
      .order("sort_order");
    return data ?? [];
  });

export const upsertAdminEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        book_key: z.enum(["pfa", "hcd"]),
        format: z.enum(["kindle", "paperback", "google_play"]),
        asin: z.string().nullable().optional(),
        external_url: z.string().url().nullable().optional(),
        marketplaces: z.array(z.string()).default([]),
        overrides: z.record(z.string(), z.string()).default({}),
        active: z.boolean().default(false),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("book_editions").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { id: _i, ...ins } = data;
      const { error } = await context.supabase.from("book_editions").insert(ins);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAdminEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("book_editions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- USERS --------
export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().max(200).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(`email.ilike.${term},full_name.ilike.${term}`);
    }
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];

    const [rolesRes, entsRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin
        .from("user_entitlements")
        .select("id, user_id, type, metadata, created_at")
        .eq("type", "pfa_pro")
        .in("user_id", ids),
    ]);
    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    const proByUser = new Map<string, any>();
    for (const e of entsRes.data ?? []) {
      if (!proByUser.has(e.user_id)) proByUser.set(e.user_id, e);
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: rolesByUser.get(p.id) ?? [],
      pro_entitlement: proByUser.get(p.id) ?? null,
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["pro", "admin"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setProQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        entitlement_id: z.string().uuid(),
        quota: z.number().int().min(0),
        used: z.number().int().min(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).rpc("admin_set_client_quota", {
      _entitlement_id: data.entitlement_id,
      _quota: data.quota,
      _used: data.used,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- QUESTIONS --------
export const listAdminQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assessment_questions")
      .select("*")
      .order("level", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        text_tr: z.string().min(1).max(1000),
        text_en: z.string().max(1000).nullable().optional(),
        level: z.number().int().min(1).max(7),
        reverse_coded: z.boolean().default(false),
        is_mini: z.boolean().default(false),
        active: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase
        .from("assessment_questions")
        .update(patch)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { id: _ignore, ...ins } = data;
      const { error } = await context.supabase.from("assessment_questions").insert(ins);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// -------- WEBINAR SESSIONS --------
export const getInstrumentVersionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: versions }, locked] = await Promise.all([
      supabaseAdmin
        .from("instrument_versions")
        .select("instrument, version, label, notes, is_current, created_at")
        .order("instrument")
        .order("version", { ascending: false }),
      Promise.all([
        supabaseAdmin.rpc("instrument_version_locked", { _instrument: "pfa" }),
        supabaseAdmin.rpc("instrument_version_locked", { _instrument: "sevenq" }),
      ]),
    ]);
    return {
      versions: versions ?? [],
      locked: { pfa: Boolean(locked[0].data), sevenq: Boolean(locked[1].data) },
    };
  });

export const bumpInstrumentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        instrument: z.enum(["pfa", "sevenq"]),
        label: z.string().max(120).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: version, error } = await (context.supabase as any).rpc("bump_instrument_version", {
      _instrument: data.instrument,
      _label: data.label ?? null,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { version: Number(version) };
  });

export const getInstrumentVersionInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { loadVersionInventory } = await import("./instrument-versions.server");
    return { versions: await loadVersionInventory() };
  });

export const diffInstrumentVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        instrument: z.enum(["pfa", "sevenq"]),
        from: z.number().int().min(1),
        to: z.number().int().min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { diffVersions } = await import("./instrument-versions.server");
    return diffVersions(data.instrument, data.from, data.to);
  });

// -------- WEBINAR SESSIONS --------
export const listWebinarSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [sessions, products] = await Promise.all([
      supabaseAdmin
        .from("webinar_sessions")
        .select("*")
        .order("starts_at", { ascending: false }),
      supabaseAdmin
        .from("products")
        .select("id, slug, name_tr, price_cents")
        .in("slug", ["bilinc-seviyeleri-calismalari", "pfa-pro-lisans-paketi"]),
    ]);
    return { sessions: sessions.data ?? [], products: products.data ?? [] };
  });

export const upsertWebinarSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        product_id: z.string().uuid(),
        title: z.string().trim().min(1, "Başlık boş bırakılamaz.").max(300),
        starts_at: z.string().min(1, "Tarih ve saat gerekli."),
        capacity: z.number().int().nullable().optional(),
        // Şema eklemeden http(s) ön eki tamamlanır; katı URL doğrulaması
        // kayıtları sessizce engellemesin.
        join_url: z
          .string()
          .trim()
          .max(600)
          .nullable()
          .optional()
          .transform((v) =>
            !v ? null : /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`,
          ),
        notes: z.string().max(4000).nullable().optional(),
        banner_url: z
          .string()
          .trim()
          .max(1000)
          .nullable()
          .optional()
          .transform((v) =>
            !v ? null : /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`,
          ),
        // Fiyatın tek kaynağı products.price_cents; buradan yalnızca güncellenir.
        price_cents: z.number().int().min(0).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const iso = new Date(data.starts_at).toISOString();
    const { id, price_cents, starts_at: _s, ...rest } = data;
    const row = { ...rest, starts_at: iso };
    let saved;
    if (id) {
      const { data: r, error } = await context.supabase
        .from("webinar_sessions")
        .update(row)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!r) throw new Error("Oturum güncellenemedi (kayıt bulunamadı veya yetki yok).");
      saved = r;
    } else {
      const { data: r, error } = await context.supabase
        .from("webinar_sessions")
        .insert(row)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      saved = r;
    }
    if (price_cents !== undefined) {
      const { error: perr } = await context.supabase
        .from("products")
        .update({ price_cents: price_cents ?? 0 })
        .eq("id", data.product_id);
      if (perr) throw new Error(`Fiyat güncellenemedi: ${perr.message}`);
    }
    return { ok: true, session: saved };
  });

export const deleteWebinarSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("webinar_sessions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWebinarRegistrants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, created_at, status")
      .eq("product_id", data.product_id)
      .eq("status", "paid")
      .eq("is_test", false);
    const ids = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
    if (ids.length === 0) return [];
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return (orders ?? []).map((o) => ({
      order_id: o.id,
      created_at: o.created_at,
      ...(map.get(o.user_id) ?? { id: o.user_id, full_name: null, email: null }),
    }));
  });

// -------- BLOG --------
export const listAdminPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z.string().min(1).max(200),
        title: z.string().min(1).max(300),
        seo_description: z.string().min(1).max(500),
        content: z.string().min(1),
        cover_image_url: z.string().url().nullable().optional(),
        // İngilizce (GLB) alanları — boşsa null; "Instagram GLB" bunlar dolunca açılır.
        title_en: z.string().max(300).nullable().optional(),
        seo_description_en: z.string().max(500).nullable().optional(),
        content_en: z.string().nullable().optional(),
        cover_image_url_en: z.string().url().nullable().optional(),
        published: z.boolean().default(false),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("blog_posts").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { id: _i, ...ins } = data;
      const { error } = await context.supabase.from("blog_posts").insert(ins);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// -------- EBOOKS --------
// Dedication şablonu ve imza yönetimi.
export const listEbookConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ebook_dedication_templates")
      .select("id, locale, body_template, footer_template, signature_path, author_name, updated_at")
      .order("locale", { ascending: true });
    return data ?? [];
  });

export const updateEbookDedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        body_template: z.string().min(1).max(2000),
        footer_template: z.string().min(1).max(500),
        author_name: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("ebook_dedication_templates")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Adminin imza görselini yüklemesi için signed upload URL.
export const createSignatureUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ locale: z.enum(["tr", "en"]), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Aynı yola upsert için önceki dosyayı sil.
    const path = `signatures/${data.locale}-${data.filename}`;
    await supabaseAdmin.storage.from("ebooks").remove([path]);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("ebooks")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    // Şablona kaydet.
    await supabaseAdmin
      .from("ebook_dedication_templates")
      .update({ signature_path: path })
      .eq("locale", data.locale);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// Tek imza — hem TR hem EN dedication'ları için ortak kullanılır.
export const createSharedSignatureUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.filename.toLowerCase().endsWith(".png") ? ".png" : ".png";
    const path = `signatures/author-signature${ext}`;
    await supabaseAdmin.storage.from("ebooks").remove([path]);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("ebooks")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    // Her iki locale şablonuna da aynı imza yolunu bağla.
    await supabaseAdmin
      .from("ebook_dedication_templates")
      .update({ signature_path: path })
      .in("locale", ["tr", "en"]);
    // Personalize edilmiş PDF'ler artık geçersiz — temizle.
    const { data: list } = await supabaseAdmin.storage.from("ebooks").list("personalized", { limit: 1000 });
    if (list && list.length) {
      await supabaseAdmin.storage.from("ebooks").remove(list.map((f) => `personalized/${f.name}`));
    }
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// Depolanmış personalize PDF'leri temizler (master veya imza değişince kullanışlı).
export const regenerateAllPersonalized = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.storage.from("ebooks").list("personalized", {
      limit: 1000,
    });
    const files = (list ?? []).map((f) => `personalized/${f.name}`);
    if (files.length > 0) {
      await supabaseAdmin.storage.from("ebooks").remove(files);
    }
    // metadata.personalized_pdf_path anahtarını temizle.
    const { data: ents } = await supabaseAdmin
      .from("user_entitlements")
      .select("id, metadata")
      .eq("type", "ebook");
    for (const e of ents ?? []) {
      const meta = { ...((e.metadata as Record<string, unknown>) ?? {}) };
      if (meta.personalized_pdf_path) {
        delete meta.personalized_pdf_path;
        await supabaseAdmin
          .from("user_entitlements")
          .update({ metadata: meta as never })
          .eq("id", e.id);
      }
    }
    return { cleared: files.length };
  });

export const listEbookProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, slug, name_tr, active, master_pdf_path, master_epub_path")
      .eq("type", "ebook");
    const out = [] as Array<{
      slug: string;
      name: string;
      active: boolean;
      masters: Array<{ label: string; path: string }>;
      files: Array<{ name: string; size: number | null }>;
    }>;
    for (const p of products ?? []) {
      const { data: list } = await supabaseAdmin.storage.from("ebooks").list(p.slug, { limit: 20 });
      const masters: Array<{ label: string; path: string }> = [];
      if (p.master_pdf_path) masters.push({ label: "PDF", path: p.master_pdf_path });
      if (p.master_epub_path) masters.push({ label: "EPUB", path: p.master_epub_path });
      out.push({
        slug: p.slug,
        name: p.name_tr,
        active: Boolean(p.active),
        masters,
        files: (list ?? []).map((f) => ({
          name: f.name,
          size: (f.metadata as any)?.size ?? null,
        })),
      });
    }
    return out;
  });

export const createEbookUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: z.string().min(1), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.slug}/${data.filename}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("ebooks")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const deleteEbookFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string(), filename: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("ebooks")
      .remove([`${data.slug}/${data.filename}`]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- ORDERS --------
export const listAdminOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z.string().optional(),
        product_id: z.string().uuid().optional(),
        include_test: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("orders")
      .select("id, user_id, product_id, amount_cents, currency, status, stripe_session_id, created_at, is_test, bundle_slug")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    if (!data.include_test) q = q.eq("is_test", false);
    const { data: orders } = await q;
    const uids = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
    const pids = Array.from(new Set((orders ?? []).map((o) => o.product_id).filter((x): x is string => !!x)));
    const [profRes, prodRes] = await Promise.all([
      uids.length
        ? supabaseAdmin.from("profiles").select("id, email, full_name").in("id", uids)
        : Promise.resolve({ data: [] as any[] }),
      pids.length
        ? supabaseAdmin.from("products").select("id, name_tr, slug").in("id", pids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pm = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
    const dm = new Map((prodRes.data ?? []).map((p: any) => [p.id, p]));
    return (orders ?? []).map((o) => ({
      ...o,
      email: pm.get(o.user_id)?.email ?? null,
      full_name: pm.get(o.user_id)?.full_name ?? null,
      product_name: o.product_id ? dm.get(o.product_id)?.name_tr ?? "—" : "—",
      product_slug: dm.get(o.product_id)?.slug ?? null,
    }));
  });
// -------- PRO LICENSES --------
export const listProLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ents } = await supabaseAdmin
      .from("user_entitlements")
      .select("id, user_id, metadata, created_at, source_order_id")
      .eq("type", "pfa_pro")
      .order("created_at", { ascending: false });
    const list = ents ?? [];
    const ids = Array.from(new Set(list.map((e) => e.user_id)));
    if (ids.length === 0) return [];
    const [profRes, invRes, roleRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ids),
      supabaseAdmin
        .from("pro_client_invites")
        .select("id, pro_user_id, client_name, status, created_at, token")
        .in("pro_user_id", ids)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids).eq("role", "pro"),
    ]);
    const pm = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
    const invByPro = new Map<string, any[]>();
    for (const i of invRes.data ?? []) {
      const arr = invByPro.get(i.pro_user_id) ?? [];
      arr.push(i);
      invByPro.set(i.pro_user_id, arr);
    }
    const roleSet = new Set((roleRes.data ?? []).map((r: any) => r.user_id));
    return list.map((e) => {
      const meta = (e.metadata ?? {}) as any;
      const quota = meta.client_quota ?? 0;
      const used = meta.client_used ?? 0;
      return {
        entitlement_id: e.id,
        user_id: e.user_id,
        email: pm.get(e.user_id)?.email ?? null,
        full_name: pm.get(e.user_id)?.full_name ?? null,
        purchased_at: e.created_at,
        quota,
        used,
        remaining: Math.max(quota - used, 0),
        has_pro_role: roleSet.has(e.user_id),
        certificate_status: meta.certificate_status ?? "pending",
        invites: invByPro.get(e.user_id) ?? [],
      };
    });
  });

export const revokeProLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), entitlement_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_entitlements").delete().eq("id", data.entitlement_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "pro");
    return { ok: true };
  });

export const setCertificateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      entitlement_id: z.string().uuid(),
      status: z.enum(["pending", "issued", "revoked"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("user_entitlements")
      .select("metadata")
      .eq("id", data.entitlement_id)
      .maybeSingle();
    const meta = { ...(((cur?.metadata as Record<string, unknown>) ?? {}) as any), certificate_status: data.status };
    const { error } = await supabaseAdmin
      .from("user_entitlements")
      .update({ metadata: meta as never })
      .eq("id", data.entitlement_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- PRO ACCOUNTS (Pro Hesaplar) --------
// PRIVACY: Bu bölüm danışan ölçek içeriğini ASLA seçmez; yalnızca COUNT / sayısal
// alanlar kullanılır. Ölçek cevap/sonuç tablolarına dokunulmaz.

export const listProAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().max(200).optional(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Filtre için önce eşleşen profil id'lerini bul.
    let matchedIds: string[] | null = null;
    const term = (data.q ?? "").trim();
    if (term) {
      const like = `%${term}%`;
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .or(`email.ilike.${like},full_name.ilike.${like}`)
        .limit(1000);
      matchedIds = (profs ?? []).map((p: any) => p.id);
      if (matchedIds.length === 0) return { rows: [], total: 0 };
    }

    let countQ = supabaseAdmin
      .from("user_entitlements")
      .select("id", { count: "exact", head: true })
      .eq("type", "pfa_pro");
    if (matchedIds) countQ = countQ.in("user_id", matchedIds);
    const { count: total } = await countQ;

    let listQ = supabaseAdmin
      .from("user_entitlements")
      .select("id, user_id, metadata, created_at, source_order_id")
      .eq("type", "pfa_pro")
      .order("created_at", { ascending: false })
      .range(data.page * data.pageSize, data.page * data.pageSize + data.pageSize - 1);
    if (matchedIds) listQ = listQ.in("user_id", matchedIds);
    const { data: ents, error } = await listQ;
    if (error) throw new Error(error.message);

    const list = ents ?? [];
    const uids = Array.from(new Set(list.map((e) => e.user_id)));
    if (uids.length === 0) return { rows: [], total: total ?? 0 };

    // PRIVACY: pro_client_invites'tan yalnızca sayım / durum alanları.
    const [profRes, invRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name").in("id", uids),
      supabaseAdmin
        .from("pro_client_invites")
        .select("pro_user_id, status")
        .in("pro_user_id", uids),
    ]);
    const pm = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
    const inviteStats = new Map<string, { pending: number; completed: number; total: number }>();
    for (const i of invRes.data ?? []) {
      const s = inviteStats.get(i.pro_user_id) ?? { pending: 0, completed: 0, total: 0 };
      s.total += 1;
      if (i.status === "pending") s.pending += 1;
      if (i.status === "completed") s.completed += 1;
      inviteStats.set(i.pro_user_id, s);
    }

    const rows = list.map((e) => {
      const meta = (e.metadata ?? {}) as any;
      const quota = Number(meta.client_quota ?? 0);
      const used = Number(meta.client_used ?? 0);
      const stats = inviteStats.get(e.user_id) ?? { pending: 0, completed: 0, total: 0 };
      return {
        entitlement_id: e.id,
        user_id: e.user_id,
        email: pm.get(e.user_id)?.email ?? null,
        full_name: pm.get(e.user_id)?.full_name ?? null,
        granted_at: e.created_at,
        source: e.source_order_id ? "purchase" : (meta.granted_by === "admin" ? "manual" : "manual"),
        quota,
        used,
        remaining: Math.max(quota - used, 0),
        invites_total: stats.total,
        invites_pending: stats.pending,
        invites_completed: stats.completed,
      };
    });
    return { rows, total: total ?? 0 };
  });

// Seçili Pro kullanıcının davetleri — SALT OKUNUR, token GÖSTERİLMEZ.
// PRIVACY: yalnızca client_name, status, created_at. Ölçek içeriği yok.
export const listProInvitesForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pro_user_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pro_client_invites")
      .select("id, client_name, status, created_at")
      .eq("pro_user_id", data.pro_user_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// E-posta / ad ile kullanıcı arama (Pro yetkisi verme akışı için).
export const searchProfilesForPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().min(2).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const like = `%${data.q.trim()}%`;
    const { data: profs, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .or(`email.ilike.${like},full_name.ilike.${like}`)
      .limit(25);
    if (error) throw new Error(error.message);
    const ids = (profs ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];
    const { data: ents } = await supabaseAdmin
      .from("user_entitlements")
      .select("user_id")
      .eq("type", "pfa_pro")
      .in("user_id", ids);
    const proSet = new Set((ents ?? []).map((e: any) => e.user_id));
    return (profs ?? []).map((p: any) => ({ ...p, is_pro: proSet.has(p.id) }));
  });

export const grantProAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        initial_quota: z.number().int().min(0).max(1000).default(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("user_entitlements")
      .select("id")
      .eq("user_id", data.user_id)
      .eq("type", "pfa_pro")
      .limit(1);
    if ((existing ?? []).length > 0) {
      throw new Error("ALREADY_PRO");
    }

    const { error: e1 } = await supabaseAdmin.from("user_entitlements").insert({
      user_id: data.user_id,
      type: "pfa_pro",
      metadata: {
        granted_by: "admin",
        client_quota: data.initial_quota,
        client_used: 0,
      },
    });
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: "pro" });
    if (e2 && !e2.message.includes("duplicate")) throw new Error(e2.message);

    return { ok: true };
  });

export const revokeProAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Davet / danışan kayıtlarını KORU; yalnızca Pro hakkını kapat.
    await supabaseAdmin
      .from("user_entitlements")
      .delete()
      .eq("user_id", data.user_id)
      .eq("type", "pfa_pro");
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "pro");
    return { ok: true };
  });

export const addProCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        amount: z.number().int().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ent, error } = await supabaseAdmin
      .from("user_entitlements")
      .select("id, metadata")
      .eq("user_id", data.user_id)
      .eq("type", "pfa_pro")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ent) throw new Error("NO_PRO_ENTITLEMENT");
    const meta = (ent.metadata ?? {}) as any;
    const currentQuota = Number(meta.client_quota ?? 0);
    const currentUsed = Number(meta.client_used ?? 0);
    const { error: e2 } = await (context.supabase as any).rpc("admin_set_client_quota", {
      _entitlement_id: ent.id,
      _quota: currentQuota + data.amount,
      _used: currentUsed,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true, new_quota: currentQuota + data.amount };
  });

// Iterate all ebook entitlements that don't have a personalized PDF yet and try to
// generate them now. Called after signature or master upload, and can be manually run.
export const runPendingPersonalizedRetry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensurePersonalizedPdf } = await import("@/lib/ebooks.functions");
    const { data: ents } = await supabaseAdmin
      .from("user_entitlements")
      .select("id, user_id, metadata")
      .eq("type", "ebook");
    let generated = 0;
    let skipped = 0;
    for (const e of ents ?? []) {
      const meta = ((e.metadata as Record<string, unknown>) ?? {}) as any;
      if (meta.personalized_pdf_path) { skipped++; continue; }
      const slug = (meta.product_slug as string) ?? "pfa-ebook-tr";
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", e.user_id)
        .maybeSingle();
      const fullName = (meta.recipient_name as string) || prof?.full_name || prof?.email || "";
      const email = (meta.recipient_email as string) || prof?.email || "";
      let buyerName: string | null = null;
      if (meta.is_gift && meta.gift_from) {
        const { data: buyer } = await supabaseAdmin
          .from("profiles").select("full_name").eq("id", meta.gift_from as string).maybeSingle();
        buyerName = buyer?.full_name ?? null;
      }
      const path = await ensurePersonalizedPdf({
        entitlementId: e.id as string,
        slug,
        existingPath: null,
        fullName,
        email,
        giftNote: (meta.gift_note as string | undefined) ?? null,
        buyerName,
      });
      if (path) generated++; else skipped++;
    }

    // Teslim duyurusu ertelenmiş siparişler: dosyalar artık hazırsa e-postayı gönder.
    let deliveries = 0;
    const { data: pendingOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "paid")
      .filter("metadata->>delivery_pending", "eq", "true");
    if ((pendingOrders ?? []).length) {
      const { sendOrderPaidEmails } = await import("@/lib/order-fulfilment.server");
      for (const o of pendingOrders ?? []) {
        const res = await sendOrderPaidEmails(o.id as string);
        if (res.buyer) deliveries++;
      }
    }
    return { generated, skipped, deliveries };
  });

// -------- WEBINAR BANNER UPLOAD --------
export const createWebinarBannerUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ session_id: z.string().uuid(), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const path = `sessions/${data.session_id}-${Date.now()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("webinar-banners")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    // 10 years — Supabase caps at 1 year (31536000 s). We refresh on read.
    const { data: urlData, error: urlErr } = await supabaseAdmin.storage
      .from("webinar-banners")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (urlErr) throw new Error(urlErr.message);
    return { path, token: signed.token, publicUrl: urlData.signedUrl };
  });

export const refreshWebinarBannerUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: urlData, error } = await supabaseAdmin.storage
      .from("webinar-banners")
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);
    if (error) throw new Error(error.message);
    return { url: urlData.signedUrl };
  });

// -------- SITE SETTINGS --------
export const listSiteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("site_settings").select("key, value");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSiteSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().min(1).max(100), value: z.string().max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: data.key, value: data.value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- PODCASTS --------
function deriveSpotifyEmbed(url: string): string {
  const m = url.match(/episode\/([A-Za-z0-9]+)/);
  if (!m) throw new Error("Geçersiz Spotify bölüm URL'i");
  return `https://open.spotify.com/embed/episode/${m[1]}`;
}

export const listAdminPodcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("podcast_episodes")
      .select("*")
      .order("episode_number", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPodcastEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        episode_number: z.number().int().min(1),
        title: z.string().min(1).max(300),
        description: z.string().max(5000).default(""),
        spotify_url: z.string().url(),
        published: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const spotify_embed_url = deriveSpotifyEmbed(data.spotify_url);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase
        .from("podcast_episodes")
        .update({ ...patch, spotify_embed_url })
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { id: _i, ...ins } = data;
      const { error } = await context.supabase
        .from("podcast_episodes")
        .insert({ ...ins, spotify_embed_url });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePodcastEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("podcast_episodes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- PRACTITIONERS --------
const practitionerCategory = z.enum(["terapotik", "kocluk", "pedagojik", "kurumsal"]);
const practitionerMode = z.enum(["online", "yuz_yuze", "her_ikisi"]);

export const listAdminPractitioners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("practitioners")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertAdminPractitioner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        full_name: z.string().trim().min(1).max(200),
        category: practitionerCategory,
        title: z.string().max(200).nullable().optional(),
        photo_url: z.string().max(2000).nullable().optional(),
        short_bio: z.string().max(300).nullable().optional(),
        long_bio: z.string().max(10000).nullable().optional(),
        specializations: z.array(z.string().max(120)).max(30).default([]),
        languages: z.array(z.string().max(60)).max(20).default([]),
        city: z.string().max(120).nullable().optional(),
        country: z.string().max(120).default("Türkiye"),
        mode: practitionerMode.default("online"),
        email: z.string().email().max(200).nullable().optional(),
        website: z.string().max(2000).nullable().optional(),
        published: z.boolean().default(false),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabaseAdmin.from("practitioners").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { id: _i, ...ins } = data;
    const { data: row, error } = await supabaseAdmin
      .from("practitioners")
      .insert(ins)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const deleteAdminPractitioner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("practitioners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createPractitionerPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (data.filename.split(".").pop() || "jpg").toLowerCase();
    const path = `photos/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("practitioner-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    const { data: urlData, error: urlErr } = await supabaseAdmin.storage
      .from("practitioner-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (urlErr) throw new Error(urlErr.message);
    return { path, token: signed.token, publicUrl: urlData.signedUrl };
  });

export const listAdminPractitionerInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("practitioner_inquiries")
      .select("id, practitioner_id, sender_name, sender_email, message, status, locale, created_at, practitioners(full_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      practitioner_id: r.practitioner_id as string,
      practitioner_name: r.practitioners?.full_name ?? "—",
      sender_name: r.sender_name as string,
      sender_email: r.sender_email as string,
      message: r.message as string,
      status: r.status as "acik" | "yanitlandi",
      locale: (r.locale ?? "tr") as "tr" | "en",
      created_at: r.created_at as string,
    }));
  });

export const updatePractitionerInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["acik", "yanitlandi"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("practitioner_inquiries")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- TEST ORDERS (admin only) --------
// Gerçek ödenmiş sipariş yolunu (trigger → entitlement → imzalı PDF → e-posta)
// uçtan uca çalıştırır; sadece is_test=true olarak işaretlenir.
export const createTestOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        product_id: z.string().uuid().optional(),
        bundle_slug: z.string().min(1).optional(),
        target_user_id: z.string().uuid().optional(),
        book_lang: z.enum(["tr", "en"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.product_id && !data.bundle_slug) throw new Error("Ürün veya paket seçin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = data.target_user_id ?? context.userId;
    const steps: Array<{ step: string; ok: boolean; detail?: string }> = [];

    let amount = 0;
    let currency = "usd";
    if (data.product_id) {
      const { data: p } = await supabaseAdmin
        .from("products").select("price_cents, currency").eq("id", data.product_id).maybeSingle();
      amount = p?.price_cents ?? 0;
      currency = p?.currency ?? "usd";
    } else if (data.bundle_slug) {
      const { data: b } = await supabaseAdmin
        .from("bundles").select("price_override_cents").eq("slug", data.bundle_slug).maybeSingle();
      amount = b?.price_override_cents ?? 0;
    }

    // 1) pending sipariş
    const { data: created, error: insErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        product_id: data.product_id ?? null,
        bundle_slug: data.bundle_slug ?? null,
        status: "pending",
        amount_cents: amount,
        currency,
        is_test: true,
        metadata: { test: true, book_lang: data.book_lang ?? "tr" },
      })
      .select("id")
      .maybeSingle();
    if (insErr || !created) throw new Error(insErr?.message ?? "Sipariş oluşturulamadı");
    steps.push({ step: "order_created", ok: true, detail: created.id });

    // 2) paid → gerçek trigger zinciri (handle_order_paid / handle_bundle_paid)
    const { error: payErr } = await supabaseAdmin
      .from("orders").update({ status: "paid" }).eq("id", created.id);
    steps.push({ step: "marked_paid", ok: !payErr, detail: payErr?.message });

    // 3) entitlement kontrolü
    const { data: ents } = await supabaseAdmin
      .from("user_entitlements")
      .select("id, type, metadata")
      .eq("source_order_id", created.id);
    steps.push({
      step: "entitlements_granted",
      ok: (ents ?? []).length > 0,
      detail: (ents ?? []).map((e) => e.type).join(", ") || "yok",
    });

    // 4) e-book varsa imzalı PDF üret (gerçek üretim yolu)
    for (const e of ents ?? []) {
      if (e.type !== "ebook") continue;
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const slug = (meta.product_slug as string | undefined) ?? "pfa-ebook-tr";
      try {
        const { ensurePersonalizedPdf } = await import("@/lib/ebooks.functions");
        const { data: prof } = await supabaseAdmin
          .from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
        const path = await ensurePersonalizedPdf({
          entitlementId: e.id,
          slug,
          existingPath: (meta.personalized_pdf_path as string | undefined) ?? null,
          fullName: (meta.recipient_name as string | undefined) || prof?.full_name || prof?.email || "",
          email: (meta.recipient_email as string | undefined) || prof?.email || "",
          giftNote: (meta.gift_note as string | undefined) ?? null,
          buyerName: null,
        });
        steps.push({ step: `personalized_pdf:${slug}`, ok: Boolean(path), detail: path ?? "üretilemedi (master/imza/şablon eksik olabilir)" });
      } catch (err) {
        steps.push({ step: `personalized_pdf:${slug}`, ok: false, detail: err instanceof Error ? err.message : "hata" });
      }
    }

    // 5) hediye kaydı (varsa)
    const { data: gifts } = await supabaseAdmin
      .from("ebook_gifts").select("id, claim_token").eq("order_id", created.id);
    if ((gifts ?? []).length) {
      steps.push({ step: "gift_created", ok: true, detail: gifts![0].claim_token });
    }

    // 6) gerçek teslim e-postaları
    try {
      const { sendOrderPaidEmails } = await import("@/lib/order-fulfilment.server");
      const res = await sendOrderPaidEmails(created.id);
      steps.push({
        step: "emails_sent",
        ok: res.buyer && res.admin,
        detail:
          `alıcı: ${res.buyer ? "gönderildi" : "gönderilmedi"}, admin: ${res.admin ? "gönderildi" : "gönderilmedi"}` +
          (res.deferred ? ` — teslim duyurusu ertelendi (${res.deferred})` : ""),
      });
    } catch (err) {
      steps.push({ step: "emails_sent", ok: false, detail: err instanceof Error ? err.message : "hata" });
    }

    return { order_id: created.id, steps };
  });

export const deleteTestOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders").select("id, is_test").eq("id", data.id).maybeSingle();
    if (!order) throw new Error("Sipariş bulunamadı");
    if (!order.is_test) throw new Error("Sadece test siparişleri silinebilir.");

    const { data: ents } = await supabaseAdmin
      .from("user_entitlements").select("id, metadata").eq("source_order_id", data.id);
    const files = (ents ?? [])
      .map((e) => ((e.metadata ?? {}) as Record<string, unknown>).personalized_pdf_path)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (files.length) await supabaseAdmin.storage.from("ebooks").remove(files);

    await supabaseAdmin.from("ebook_gifts").delete().eq("order_id", data.id);
    await supabaseAdmin.from("user_entitlements").delete().eq("source_order_id", data.id);
    await supabaseAdmin.from("orders").delete().eq("id", data.id);
    return { ok: true, removed_files: files.length, removed_entitlements: (ents ?? []).length };
  });

export const listTestOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, product_id, bundle_slug, amount_cents, currency, status, created_at")
      .eq("is_test", true)
      .order("created_at", { ascending: false });
    const rows = orders ?? [];
    if (!rows.length) return [];
    const uids = Array.from(new Set(rows.map((o) => o.user_id)));
    const pids = rows.map((o) => o.product_id).filter((x): x is string => !!x);
    const [profRes, prodRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name").in("id", uids),
      pids.length
        ? supabaseAdmin.from("products").select("id, name_tr").in("id", pids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pm = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
    const dm = new Map((prodRes.data ?? []).map((p: any) => [p.id, p]));
    return rows.map((o) => ({
      ...o,
      email: pm.get(o.user_id)?.email ?? null,
      product_name: o.product_id ? dm.get(o.product_id)?.name_tr ?? "—" : o.bundle_slug ? `Paket: ${o.bundle_slug}` : "—",
    }));
  });
