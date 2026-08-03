import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { confirmNewsletter } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/bulten/onayla")({
  head: () => ({
    meta: [
      { title: "Bülten Aboneliği Onayı — PFA" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "PFA bülten aboneliğinizi onaylama sayfası." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) ?? "" }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = Route.useSearch();
  const confirm = useServerFn(confirmNewsletter);
  const [state, setState] = useState<"loading" | "ok" | "already" | "unknown" | "error">("loading");

  useEffect(() => {
    if (!token) { setState("unknown"); return; }
    confirm({ data: { token } })
      .then((r) => setState(r?.ok ? (r.alreadyConfirmed ? "already" : "ok") : "unknown"))
      .catch(() => setState("error"));
  }, [token, confirm]);

  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-10 text-center">
        <div className="text-xs tracking-[0.3em] text-accent">PFA BÜLTEN</div>
        <h1 className="mt-4 font-serif text-3xl">
          {state === "loading" && "Onaylanıyor…"}
          {state === "ok" && "Aboneliğiniz onaylandı."}
          {state === "already" && "Aboneliğiniz zaten onaylı."}
          {state === "unknown" && "Bağlantı geçersiz."}
          {state === "error" && "İşlem tamamlanamadı."}
        </h1>
        <p className="mt-4 text-sm text-foreground/75">
          {state === "ok" && "İlk bülten sayısını e-posta adresinize gönderdik. Bundan sonra ayda bir yazıyoruz."}
          {state === "already" && "Ek bir işlem yapmanız gerekmiyor."}
          {state === "loading" && "Lütfen bekleyin."}
          {(state === "unknown" || state === "error") &&
            "Bu onay bağlantısı geçerli değil ya da süresi dolmuş. Bültene yeniden kaydolabilir ya da info@psychofunctionalanalysis.com adresine yazabilirsiniz."}
        </p>
        <Link to="/blog" className="btn-primary mt-8 inline-flex">Blog'a git</Link>
      </div>
    </div>
  );
}
