import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
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
}

export const listPublishedPodcasts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("podcast_episodes")
    .select("id, episode_number, title, description, spotify_url, spotify_embed_url")
    .eq("published", true)
    .order("episode_number", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Only these keys may be read through this public endpoint. site_settings also
// holds the admin notification address and the cron token, which must never be
// reachable from the browser.
const PUBLIC_SETTING_KEYS = new Set([
  "podcast_program_url",
  "sevenq_pilot_open",
  "newsletter_bg_image_url",
  "newsletter_bg_side",
]);

function isPublicSettingKey(key: string) {
  return PUBLIC_SETTING_KEYS.has(key) || key.startsWith("social_");
}

export const getPublicSiteSetting = createServerFn({ method: "POST" })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }) => {
    if (!isPublicSettingKey(data.key)) return null;
    const sb = publicClient();
    const { data: row } = await sb.from("site_settings").select("value").eq("key", data.key).maybeSingle();
    return row?.value ?? null;
  });