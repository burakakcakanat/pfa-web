// Eski /webinarlar/pfa-pro vitrini artık doğrudan lisans paketi satışı yapmıyor.
// Uygulayıcı programı bilgileri /uygulayici-olun altında; dış bağlantılar kırılmasın.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/webinarlar/pfa-pro")({
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
