import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Uygulayıcı kitlesine ait webinarlar (products.webinar_audience = 'practitioner').
 * Yalnızca `pro` rolü taşıyan hesaplara görünür (Fellow zaten pro taşır).
 * Genel (audience='general') webinar yüzeyleri bu listeden etkilenmez.
 */
export const listPractitionerWebinars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isPro = (roles ?? []).some((r) => r.role === "pro" || r.role === "fellow" || r.role === "admin");
    if (!isPro) return { isPro: false, tier: "practitioner" as const, items: [] };

    const { data: acc } = await supabase
      .from("practitioner_accounts")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = (acc?.tier ?? "practitioner") as "practitioner" | "fellow";

    const { data: products } = await supabase
      .from("products")
      .select("id, slug, name_tr, name_en, description_tr, price_cents, currency, included_in_program, active")
      .eq("type", "webinar")
      .eq("webinar_audience", "practitioner")
      .eq("active", true)
      .order("created_at", { ascending: true });

    const list = products ?? [];
    if (list.length === 0) return { isPro: true, tier, items: [] };
    const ids = list.map((p) => p.id);

    const [{ data: prices }, { data: myOrders }] = await Promise.all([
      supabase.from("product_prices").select("product_id, currency, price_cents").in("product_id", ids).eq("active", true),
      supabase.from("orders").select("product_id, status").in("product_id", ids).eq("status", "paid"),
    ]);

    // Tanıtım alanları: temel tabloda ziyaretçi erişimi yok, görünüm yalnızca
    // pazarlama kolonlarını içerir (join_url/notes yok).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sessions } = await supabaseAdmin
      .from("webinar_sessions_public")
      .select("id, product_id, title, starts_at, banner_url")
      .in("product_id", ids)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    const owned = new Set((myOrders ?? []).map((o) => o.product_id));
    const priceMap: Record<string, Record<string, number>> = {};
    for (const p of prices ?? []) {
      priceMap[p.product_id] = { ...(priceMap[p.product_id] ?? {}), [p.currency]: p.price_cents };
    }

    return {
      isPro: true,
      tier,
      items: list.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name_tr,
        description: p.description_tr,
        included_in_program: !!p.included_in_program,
        free_for_me: !!p.included_in_program && tier === "fellow",
        registered: owned.has(p.id),
        prices: priceMap[p.id] ?? {},
        fallback_price_cents: p.price_cents ?? null,
        fallback_currency: p.currency ?? "usd",
        session: (sessions ?? []).find((s) => s.product_id === p.id) ?? null,
      })),
    };
  });

/** Fellow rozeti için programa dahil webinara ücretsiz kayıt (0₺ gerçek sipariş). */
export const registerFreeProgramWebinar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product_slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: orderId } = await (context.supabase as any).rpc("register_free_program_webinar", {
      _product_slug: data.product_slug,
    });
    if (error) throw new Error(error.message);
    return { ok: true, order_id: orderId as string };
  });
