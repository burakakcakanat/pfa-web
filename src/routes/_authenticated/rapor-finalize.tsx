import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { saveAssessment } from "@/lib/assessment.functions";

const STORAGE_KEY = "pfa_pending_mini_answers";

export const Route = createFileRoute("/_authenticated/rapor-finalize")({
  head: () => ({ meta: [{ title: "Rapor hazırlanıyor — PFA" }] }),
  component: FinalizePage,
});

function FinalizePage() {
  const navigate = useNavigate();
  const save = useServerFn(saveAssessment);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          await navigate({ to: "/degerlendirme" });
          return;
        }
        const parsed = JSON.parse(raw) as { answers: { question_id: string; value: number }[] };
        const res = await save({ data: { type: "mini", answers: parsed.answers } });
        window.localStorage.removeItem(STORAGE_KEY);
        await navigate({ to: "/rapor/$sessionId", params: { sessionId: res.session_id }, replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Rapor kaydedilemedi.");
      }
    })();
  }, [navigate, save]);

  return (
    <div className="container-page py-20 text-center">
      {error ? (
        <div className="mx-auto max-w-md rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
      ) : (
        <p className="text-sm text-muted-foreground">Raporunuz hazırlanıyor…</p>
      )}
    </div>
  );
}