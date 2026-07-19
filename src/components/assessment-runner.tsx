import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LEVEL_LABEL_TR } from "@/lib/assessment-scoring";

type Question = {
  id: string;
  level: number;
  text_tr: string;
  reverse_coded: boolean;
  sort_order: number;
};

const LIKERT: { value: number; label: string }[] = [
  { value: 1, label: "Hiç katılmıyorum" },
  { value: 2, label: "Katılmıyorum" },
  { value: 3, label: "Kararsızım" },
  { value: 4, label: "Katılıyorum" },
  { value: 5, label: "Tamamen katılıyorum" },
];

type Props = {
  variant: "mini" | "full";
  onComplete: (answers: { question_id: string; value: number }[]) => void | Promise<void>;
  submitting?: boolean;
};

export function AssessmentRunner({ variant, onComplete, submitting }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("assessment_questions")
        .select("id, level, text_tr, reverse_coded, sort_order")
        .eq("active", true);
      if (variant === "mini") q = q.eq("is_mini", true);
      const { data, error } = await q.order("level").order("sort_order");
      if (error) {
        setError(error.message);
        return;
      }
      setQuestions((data ?? []) as Question[]);
    })();
  }, [variant]);

  const total = questions?.length ?? 0;
  const current = questions?.[idx];
  const answeredCount = Object.keys(answers).length;
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;

  const grouped = useMemo(() => {
    const g: Record<number, number> = {};
    (questions ?? []).forEach((q) => {
      g[q.level] = (g[q.level] ?? 0) + 1;
    });
    return g;
  }, [questions]);

  function answer(v: number) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: v }));
    if (idx < total - 1) setIdx(idx + 1);
  }

  async function finish() {
    if (!questions) return;
    const missing = questions.filter((q) => !(q.id in answers));
    if (missing.length) {
      setError(`${missing.length} soru cevaplanmadı.`);
      setIdx(questions.findIndex((q) => q.id === missing[0].id));
      return;
    }
    const payload = questions.map((q) => ({ question_id: q.id, value: answers[q.id] }));
    await onComplete(payload);
  }

  if (error && !questions) {
    return <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>;
  }
  if (!questions) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Sorular yükleniyor…</div>;
  }
  if (questions.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Aktif soru bulunamadı.</div>;
  }
  if (!current) return null;

  const selected = answers[current.id];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Soru {idx + 1} / {total}</span>
          <span>{answeredCount} / {total} cevaplandı</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {Object.keys(grouped).map((lvlStr) => {
            const lvl = Number(lvlStr);
            const isCurrent = current.level === lvl;
            return (
              <span
                key={lvl}
                className={`rounded-full border px-2 py-0.5 ${isCurrent ? "border-accent text-accent" : "border-border"}`}
              >
                L{lvl}
              </span>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 md:p-8">
        <div className="text-xs uppercase tracking-[0.25em] text-accent">
          {LEVEL_LABEL_TR[current.level]}
        </div>
        <h2 className="mt-3 font-serif text-2xl md:text-3xl leading-snug">{current.text_tr}</h2>

        <div className="mt-6 grid gap-2">
          {LIKERT.map((opt) => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => answer(opt.value)}
                className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  active
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.value}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="text-sm text-muted-foreground hover:text-accent disabled:opacity-40"
          >
            ← Önceki
          </button>
          {idx < total - 1 ? (
            <button
              type="button"
              onClick={() => setIdx(Math.min(total - 1, idx + 1))}
              className="text-sm text-muted-foreground hover:text-accent"
            >
              Sonraki →
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={submitting || answeredCount < total}
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? "Kaydediliyor…" : "Sonucu Gör"}
            </button>
          )}
        </div>
        {error && <div className="mt-3 text-xs text-destructive">{error}</div>}
      </div>
    </div>
  );
}