import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Keys safe to expose to any visitor. site_settings also stores the admin
// notification address and the cron token; the RLS policy blocks them, and this
// explicit list keeps the server side honest too.
const PUBLIC_SETTING_KEYS = [
  "social_instagram",
  "social_linkedin",
  "social_linkedin_intl",
  "social_facebook",
  "social_x",
  "social_youtube",
  "podcast_program_url",
  "sevenq_pilot_open",
  "payments_enabled",
  "payment_mode",
  "newsletter_bg_image_url",
  "newsletter_bg_side",
];

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supa = createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await supa.from("site_settings").select("key, value").in("key", PUBLIC_SETTING_KEYS);
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (r.value) out[r.key] = r.value;
  return out;
});

export const getUpcomingWebinarForProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient<Database>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: prod } = await supa
      .from("products")
      .select("id, price_cents")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!prod) return { session: null, price_cents: null };
    // Tanıtım alanları sunucuda okunur: temel tabloda ziyaretçi erişimi yok,
    // görünüm yalnızca pazarlama kolonlarını içerir (join_url/notes yok).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sess } = await supabaseAdmin
      .from("webinar_sessions_public")
      .select("id, title, starts_at, banner_url")
      .eq("product_id", prod.id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return { session: sess ?? null, price_cents: prod.price_cents ?? null };
  });