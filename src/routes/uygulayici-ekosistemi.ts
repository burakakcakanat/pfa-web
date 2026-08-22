// Ekosistem sayfası /uygulayici-olun içine birleştirildi.
// Dışarıdan gelen eski bağlantılar kırılmasın diye kalıcı yönlendirme.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/uygulayici-ekosistemi")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 301,
          headers: {
            Location: "/uygulayici-olun",
            "Cache-Control": "no-store",
          },
        }),
    },
  },
});
