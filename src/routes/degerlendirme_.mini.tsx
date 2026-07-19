import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentRunner } from "@/components/assessment-runner";
import { saveAssessment } from "@/lib/assessment.functions";

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

function MiniTestPage() {
  const navigate = useNavigate();
  const save = useServerFn(saveAssessment);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onComplete(answers: { question_id: string; value: number }[]) {
    setErr(null);
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, ts: Date.now() }));
        }
        await navigate({ to: "/auth", search: { redirect: "/rapor-finalize" } });
        return;
      }
      const res = await save({ data: { type: "mini", answers } });
      await navigate({ to: "/rapor/$sessionId", params: { sessionId: res.session_id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-16">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Mini Değerlendirme</div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">7 seviyede kısa bir bakış</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          35 soru. 5-8 dakika. Sonucu görmek için ücretsiz üyelik gerekir.
        </p>
      </header>
      <AssessmentRunner variant="mini" onComplete={onComplete} submitting={submitting} />
      {err && <div className="mx-auto mt-4 max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</div>}
      <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
        Bu değerlendirme klinik bir tanı aracı değildir; işlevsel farkındalık için bir gelişim aracıdır.
      </p>
    </div>
  );
}