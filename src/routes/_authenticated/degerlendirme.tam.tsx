import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentRunner } from "@/components/assessment-runner";
import { saveAssessment } from "@/lib/assessment.functions";
import { ResearchConsentStep } from "@/components/research-consent-step";
import { EMPTY_CONSENT, type ResearchConsentInput } from "@/lib/research-consent";

export const Route = createFileRoute("/_authenticated/degerlendirme/tam")({
  head: () => ({
    meta: [
      { title: "Tam Assessment — PFA" },
      { name: "description", content: "PFA Tam Değerlendirme: yedi bilinç seviyesinde ayrıntılı işlevsel farkındalık raporu." },
    ],
  }),
  component: FullTestPage,
});

function FullTestPage() {
  const navigate = useNavigate();
  const save = useServerFn(saveAssessment);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [consent, setConsent] = useState<ResearchConsentInput>(EMPTY_CONSENT);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("user_entitlements")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("type", "assessment_full")
        .limit(1);
      setEntitled(!!data && data.length > 0);
    })();
  }, []);

  async function onComplete(answers: { question_id: string; value: number }[]) {
    setErr(null);
    setSubmitting(true);
    try {
      const res = await save({ data: { type: "full", answers, consent } });
      await navigate({ to: "/rapor/$sessionId", params: { sessionId: res.session_id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (entitled === null) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">Yükleniyor…</div>;
  }
  if (!entitled) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-serif text-2xl">Tam Assessment için yetkiniz yok</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Tam Assessment + Bilinç Seviyesi Raporu satın alarak bu değerlendirmeye erişebilirsiniz.
          </p>
          <Link to="/degerlendirme" className="btn-primary mt-6 inline-block">Değerlendirme sayfasına git</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-16">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Tam Assessment</div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">Ayrıntılı Bilinç Seviyesi Raporu</h1>
      </header>
      {started ? (
        <AssessmentRunner variant="full" onComplete={onComplete} submitting={submitting} />
      ) : (
        <ResearchConsentStep
          value={consent}
          onChange={setConsent}
          onContinue={() => setStarted(true)}
        />
      )}
      {err && <div className="mx-auto mt-4 max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</div>}
      <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
        Bu değerlendirme klinik bir tanı aracı değildir; işlevsel farkındalık için bir gelişim aracıdır.
      </p>
    </div>
  );
}