import { createFileRoute } from "@tanstack/react-router";

// Marka görselleri için kalıcı (süresi bitmeyen) genel adres. Yalnızca
// "site-media" kutusundan okur; özel kitap/kullanıcı dosyalarına erişmez.
const MEDIA_BUCKET = "site-media";

export const Route = createFileRoute("/api/public/media/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = decodeURIComponent(String((params as { file: string }).file ?? ""));
        // Yol geçişi ve alt klasör denemelerini reddet.
        if (!raw || raw.includes("/") || raw.includes("..")) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).download(raw);
        if (error || !data) return new Response("Not found", { status: 404 });
        const bytes = await data.arrayBuffer();
        return new Response(bytes, {
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});