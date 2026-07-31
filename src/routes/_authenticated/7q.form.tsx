import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SevenqRunner } from "@/components/sevenq-runner";
import { BuyButton } from "@/components/buy-button";
import { getSevenqAccess, startSevenqSession, completeSevenqSession } from "@/lib/sevenq.functions";

export const Route = createFileRoute("/_authenticated/7q/form")({
  validateSearch: (search: Record<string, unknown>) => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  head: () => ({
    meta: [
      { title: "7Q Profili Formu — PFA" },
      { name: "description", content: "7Q Profili envanteri: yedi seviyede kapasite maddeleri." },
    ],
  }),
  component: SevenqFormPage,
});

function SevenqFormPage() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const checkAccess = useServerFn(getSevenqAccess);
  const start = useServerFn(startSevenqSession);
  const complete = useServerFn(completeSevenqSession);

  const [access, setAccess] = useState<{ pilotOpen: boolean; entitled: boolean; allowed: boolean } | null>(null);
  const [session, setSession] = useState<{ session_id: string; answers: { question_id: string; value: number }[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const a = await checkAccess({ data: undefined as unknown as never });
        setAccess(a);
        if (!a.allowed) return;
        const s = await start({ data: { invite: invite ?? null } });
        setSession(s as typeof session);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
      }
    })();
  }, [checkAccess, start, invite]);

  async function onComplete() {
    if (!session) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await complete({ data: { session_id: session.session_id } });
      await navigate({ to: "/7q/rapor/$sessionId", params: { sessionId: res.session_id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (err && !session) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-sm text-destructive">{err}</p>
        <Link to="/7q" className="mt-4 inline-block text-accent">← 7Q sayfasına dön</Link>
      </div>
    );
  }

  if (!access) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  if (!access.allowed) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-serif text-2xl">7Q Profili için erişim gerekiyor</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pilot dönem tamamlandı. 7Q Profili'ni satın alarak envanteri doldurabilir ve raporunuzu
            görüntüleyebilirsiniz.
          </p>
          <div className="mt-6 flex justify-center">
            <BuyButton productSlug="7q-profili" label="7Q Profili Satın Al" />
          </div>
          <Link to="/7q" className="mt-6 inline-block text-sm text-accent">← 7Q hakkında</Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">Oturum hazırlanıyor…</div>;
  }

  return (
    <div className="container-page py-16">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">7Q Profili</div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">Kapasite Envanteri</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Doğru ya da yanlış cevap yoktur. Olmak istediğinizi değil, şu an olanı işaretleyin.
        </p>
      </header>
      <SevenqRunner
        sessionId={session.session_id}
        initialAnswers={session.answers}
        onComplete={onComplete}
        submitting={submitting}
      />
      {err && <p className="mt-6 text-center text-sm text-destructive">{err}</p>}
    </div>
  );
}
