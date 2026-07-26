import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { unsubscribeNewsletter } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/bulten/ayril")({
  head: () => ({
    meta: [
      { title: "Bültenden Ayrıl — PFA" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "PFA bülten aboneliğinden ayrılma sayfası." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) ?? "" }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const unsub = useServerFn(unsubscribeNewsletter);
  const [state, setState] = useState<"loading" | "ok" | "unknown">("loading");

  useEffect(() => {
    if (!token) { setState("unknown"); return; }
    unsub({ data: { token } })
      .then((r) => setState(r?.ok ? "ok" : "unknown"))
      .catch(() => setState("unknown"));
  }, [token, unsub]);

  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-10 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">PFA Bülten</div>
        <h1 className="mt-4 font-serif text-3xl">
          {state === "loading" && "İşleniyor…"}
          {state === "ok" && "E-posta listemizden ayrıldınız."}
          {state === "unknown" && "İsteğiniz alındı."}
        </h1>
        <p className="mt-4 text-sm text-foreground/75">
          {state === "ok"
            ? "Bundan sonra bülten göndermeyeceğiz. Fikriniz değişirse her zaman yeniden abone olabilirsiniz."
            : "Bir sorun oluştuysa lütfen bize bildirin."}
        </p>
      </div>
    </div>
  );
}