import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentRunner } from "@/components/assessment-runner";
import { AssessmentResult } from "@/components/assessment-result";
import { AssessmentNextSteps } from "@/components/assessment-next-steps";
import { saveAssessment } from "@/lib/assessment.functions";
import { computeScores } from "@/lib/assessment-scoring";
import { ResearchConsentStep } from "@/components/research-consent-step";
import { EMPTY_CONSENT, type ResearchConsentInput } from "@/lib/research-consent";

const STORAGE_KEY = "pfa_pending_mini_answers";

export const Route = createFileRoute("/degerlendirme_/mini")({
  head: () => ({
    meta: [
      { title: "Ücretsiz Mini Test — PFA" },
      { name: "description", content: "PFA Ücretsiz Mini Değerlendirme: 7 bilinç seviyesinde işlevsel farkındalığınıza kısa bir bakış." },
    ],
  }),
  component: MiniTestPage,
});

type LocalResult = {
  level_scores: Record<string, number>;
  intelligence_scores: Record<string, number>;
};

function MiniTestPage() {
  const navigate = useNavigate();
  const save = useServerFn(saveAssessment);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<LocalResult | null>(null);
  const [consent, setConsent] = useState<ResearchConsentInput>(EMPTY_CONSENT);
  const [started, setStarted] = useState(false);

  async function onComplete(answers: { question_id: string; value: number }[]) {
    setErr(null);
    setSubmitting(true);
    try {
      const { data: questions, error: qErr } = await supabase
        .from("assessment_questions")
        .select("id, level, reverse_coded")
        .in("id", answers.map((a) => a.question_id));
      if (qErr || !questions) throw new Error("Sorular yüklenemedi.");

      const scores = computeScores(
        answers,
        questions.map((q) => ({ id: q.id, level: q.level, reverse_coded: q.reverse_coded })),
      );

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        // Keep answers so the result survives sign-up (/rapor-finalize picks them up).
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, consent, ts: Date.now() }));
        }
        setResult({ level_scores: scores.level_scores, intelligence_scores: scores.intelligence_scores });
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const res = await save({ data: { type: "mini", answers, consent } });
      await navigate({ to: "/rapor/$sessionId", params: { sessionId: res.session_id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="container-page py-16">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <div className="text-xs tracking-[0.3em] text-accent">MİNİ DEĞERLENDİRME SONUCU</div>
          <h1 className="mt-3 font-serif text-3xl md:text-4xl">Yedi seviyedeki görünümünüz</h1>
        </header>
        <div className="mx-auto max-w-4xl">
          <AssessmentResult
            levelScores={result.level_scores}
            intelligenceScores={result.intelligence_scores}
            variant="mini"
            detail={false}
          />

          <div className="mt-12 rounded-lg border-2 border-accent/50 bg-accent/5 p-8 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">ÜCRETSİZ ÜYELİK</div>
            <h3 className="mt-3 font-serif text-2xl">Ayrıntılı okumayı açın ve bu sonucu kaydedin</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">
              Üyelik ücretsizdir. Hesap açtığınızda bu sonuç hesabınıza kaydedilir; Hesabım
              sayfasından tekrar görebilir ve her seviye için ayrıntılı yorumu okuyabilirsiniz.
              Cevaplarınız tarayıcınızda tutuluyor, kayıt olduğunuzda sonuç kaybolmaz.
            </p>
            <div className="mt-6">
              <Link to="/auth" search={{ redirect: "/rapor-finalize" }} className="btn-primary hover:btn-primary-hover">
                Ücretsiz Hesap Aç
              </Link>
            </div>
          </div>

          <AssessmentNextSteps />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-16">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">MİNİ DEĞERLENDİRME</div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">7 seviyede kısa bir bakış</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Yedi seviyeyi kapsayan kısa madde seti. 5-8 dakika. Üyelik gerekmez; sonucunuzu hemen görürsünüz.
        </p>
      </header>
      {started ? (
        <AssessmentRunner variant="mini" onComplete={onComplete} submitting={submitting} />
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
