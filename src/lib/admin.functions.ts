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
          .eq("status", "paid"),
        supabaseAdmin.from("products").select("id, slug, name_tr, type"),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("assessment_sessions")
          .select("id, type, status, created_at"),
        supabaseAdmin.from("user_entitlements").select("id, type, metadata"),
        supabaseAdmin
          .from("orders")
          .select("id, amount_cents, currency, status, created_at, product_id, user_id")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const products = productsRes.data ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const paid = ordersRes.data ?? [];
    const totalRevenueCents = paid.reduce((s, o) => s + (o.amount_cents ?? 0), 0);
    const revenueByProduct: Record<string, { name: string; cents: number; count: number }> = {};
    for (const o of paid) {
      const p = productMap.get(o.product_id);
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

    const latestOrders = (recentRes.data ?? []).map((o) => ({
      ...o,
      product_name: productMap.get(o.product_id)?.name_tr ?? "—",
    }));

    return {
      totalRevenueCents,
      revenueByProduct: Object.entries(revenueByProduct).map(([slug, v]) => ({ slug, ...v })),
      memberCount,
      miniCount,
      fullCount,
      webinarRegs,
      activePro,
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
        .select("id, slug, name_tr")
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
        title: z.string().min(1).max(300),
        starts_at: z.string(),
        capacity: z.number().int().nullable().optional(),
        join_url: z.string().url().nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase
        .from("webinar_sessions")
        .update(patch)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { id: _i, ...ins } = data;
      const { error } = await context.supabase.from("webinar_sessions").insert(ins);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
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
      .eq("status", "paid");
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
export const listEbookProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, slug, name_tr")
      .eq("type", "ebook");
    const out = [] as Array<{
      slug: string;
      name: string;
      files: Array<{ name: string; size: number | null }>;
    }>;
    for (const p of products ?? []) {
      const { data: list } = await supabaseAdmin.storage.from("ebooks").list(p.slug, { limit: 20 });
      out.push({
        slug: p.slug,
        name: p.name_tr,
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
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("orders")
      .select("id, user_id, product_id, amount_cents, currency, status, stripe_session_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    const { data: orders } = await q;
    const uids = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
    const pids = Array.from(new Set((orders ?? []).map((o) => o.product_id)));
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
      product_name: dm.get(o.product_id)?.name_tr ?? "—",
      product_slug: dm.get(o.product_id)?.slug ?? null,
    }));
  });