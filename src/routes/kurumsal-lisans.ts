// Eski adres — /kurumsal-program-lisansi'na kalıcı yönlendirme.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/kurumsal-lisans")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 301,
          headers: {
            Location: "/kurumsal-program-lisansi",
            "Cache-Control": "no-store",
          },
        }),
    },
  },
});
