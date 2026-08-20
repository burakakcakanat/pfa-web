import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getRateCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ratesRes, tiersRes, fxRes, logRes, prodRes, priceRes, bundleRes, itemsRes] =
      await Promise.all([
        supabaseAdmin.from("system_rates").select("*").order("kategori").order("key"),
        supabaseAdmin.from("corporate_package_tiers").select("*").order("tier"),
        supabaseAdmin
          .from("fx_rates")
          .select("tarih, para_birimi, tcmb_alis, tcmb_satis, kaynak")
          .order("tarih", { ascending: false })
          .limit(60),
        supabaseAdmin
          .from("rate_change_log")
          .select("id, key, eski_deger, yeni_deger, degistiren, degisim_at, not_metni")
          .order("degisim_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("products")
          .select("id, slug, name_tr, category, type, active")
          .order("category")
          .order("slug"),
        supabaseAdmin
          .from("product_prices")
          .select(
            "product_id, currency, price_cents, active, auto_update_frozen, last_fx_rate, price_set_at, previous_price_cents, previous_valid_until, updated_at",
          ),
        supabaseAdmin
          .from("bundles")
          .select("id, slug, name_tr, book_key, includes_book, discount_percent, active, sort_order")
          .order("sort_order"),
        supabaseAdmin.from("bundle_items").select("bundle_id, product_slug, quantity"),
      ]);

    // Değiştiren kişileri isimle göster
    const actorIds = [
      ...new Set(
        [
          ...(logRes.data ?? []).map((r: any) => r.degistiren),
          ...(ratesRes.data ?? []).map((r: any) => r.updated_by),
        ].filter(Boolean),
      ),
    ] as string[];
    const actors: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds);
      for (const p of profs ?? []) actors[p.id] = p.full_name || p.email || p.id;
    }

    return {
      rates: ratesRes.data ?? [],
      tiers: tiersRes.data ?? [],
      fx: fxRes.data ?? [],
      log: logRes.data ?? [],
      products: prodRes.data ?? [],
      prices: priceRes.data ?? [],
      bundles: bundleRes.data ?? [],
      bundleItems: itemsRes.data ?? [],
      actors,
    };
  });

export const setSystemRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(1), value: z.number().finite(), note: z.string().max(300).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("system_rates")
      .select("key, min_value, max_value, label_tr")
      .eq("key", data.key)
      .maybeSingle();
    if (!row) throw new Error("Parametre bulunamadı.");
    if (row.min_value !== null && data.value < Number(row.min_value))
      throw new Error(`${row.label_tr} en az ${row.min_value} olabilir.`);
    if (row.max_value !== null && data.value > Number(row.max_value))
      throw new Error(`${row.label_tr} en fazla ${row.max_value} olabilir.`);
    const { error } = await supabaseAdmin
      .from("system_rates")
      .update({ value_numeric: data.value, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCorporateTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), indirim_orani: z.number().min(0).max(100), aktif: z.boolean() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("corporate_package_tiers")
      .update({ indirim_orani: data.indirim_orani, aktif: data.aktif })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Yönetici YALNIZCA USD girer. products.price_cents'e asla yazılmaz. */
export const setUsdPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ product_id: z.string().uuid(), price_cents: z.number().int().min(0).max(100_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin.from("product_prices").upsert(
      {
        product_id: data.product_id,
        currency: "usd",
        price_cents: data.price_cents,
        active: true,
        price_set_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "product_id,currency" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPriceFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        currency: z.enum(["try", "eur"]),
        frozen: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("product_prices")
      .update({ auto_update_frozen: data.frozen, updated_at: new Date().toISOString() })
      .eq("product_id", data.product_id)
      .eq("currency", data.currency);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Dondurulmuş para birimi fiyatını elle ayarlar. */
export const setManualDerivedPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        currency: z.enum(["try", "eur"]),
        price_cents: z.number().int().min(0).max(10_000_000_00),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin.from("product_prices").upsert(
      {
        product_id: data.product_id,
        currency: data.currency,
        price_cents: data.price_cents,
        active: true,
        price_set_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "product_id,currency" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBundleDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), discount_percent: z.number().int().min(0).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bundles")
      .update({ discount_percent: data.discount_percent })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** TCMB'den kuru şimdi çeker. */
export const syncFxNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchTcmbRates, persistFxSnapshot } = await import("@/lib/fx.server");
    const snap = await fetchTcmbRates();
    await persistFxSnapshot(supabaseAdmin as never, snap);
    return snap;
  });

/** "Türet" butonu — eşiklere bakmadan TRY/EUR fiyatlarını yeniden hesaplar. */
export const deriveNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        product_id: z.string().uuid().optional(),
        currency: z.enum(["try", "eur"]).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runDerivation } = await import("@/lib/fx.server");
    const { snapshot, outcomes } = await runDerivation(supabaseAdmin as never, {
      force: true,
      ...(data.product_id ? { onlyProductId: data.product_id } : {}),
      ...(data.currency ? { onlyCurrency: data.currency } : {}),
    });
    return { snapshot, outcomes };
  });