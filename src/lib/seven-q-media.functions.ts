import { createServerFn } from "@tanstack/react-start";
import { SEVEN_Q_FILENAMES } from "./seven-q-visuals";

// Herkese açık, salt-okunur çözümleyici: medya kütüphanesindeki (site_media)
// 7Q dosya adlarını kalıcı genel adreslerine eşler. Dosya yoksa anahtar yoktur.
export const getSevenQImageUrls = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_media")
    .select("original_filename, public_url, created_at")
    .in("original_filename", SEVEN_Q_FILENAMES)
    .order("created_at", { ascending: false });
  if (error) return {} as Record<string, string>;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const name = (row as { original_filename: string }).original_filename;
    const url = (row as { public_url: string | null }).public_url;
    if (name && url && !map[name]) map[name] = url;
  }
  return map;
});
