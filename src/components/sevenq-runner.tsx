import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveSevenqAnswer } from "@/lib/sevenq.functions";
import { SEVENQ_LEVEL_LABEL, SEVENQ_LIKERT } from "@/lib/sevenq-scoring";

type Question = { id: string; level: number; text_tr: string; sort_order: number };

type Props = {
  sessionId: string;
  initialAnswers: { question_id: string; value: number }[];
  onComplete: () => void | Promise<void>;
  submitting?: boolean;
};

export function SevenqRunner({ sessionId, initialAnswers, onComplete, submitting }: Props) {
  const save = useServerFn(saveSevenqAnswer);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>(
    Object.fromEntries(initialAnswers.map((a) => [a.question_id, a.value])),
  );
  const [levelIdx, setLevelIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sevenq_questions")
        .select("id, level, text_tr, sort_order")
        .eq("active", true)
        .order("level")
        .order("sort_order");
      if (error) {
        setError(error.message);
        return;
      }
      setQuestions((data ?? []) as Question[]);
    })();
  }, []);

  const levels = useMemo(() => {
    const set = new Set((questions ?? []).map((q) => q.level));
    return Array.from(set).sort((a, b) => a - b);
  }, [questions]);

  const total = questions?.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;
  const currentLevel = levels[levelIdx];
  const levelQuestions = (questions ?? []).filter((q) => q.level === currentLevel);
  const levelDone = levelQuestions.every((q) => q.id in answers);
  const isLastLevel = levelIdx === levels.length - 1;

  async function answer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSavingCount((c) => c + 1);
    try {
      await save({ data: { session_id: sessionId, question_id: questionId, value } });
    } catch {
      setError("Cevap kaydedilemedi — bağlantınızı kontrol edin.");
    } finally {
      setSavingCount((c) => c - 1);
    }
  }

  async function finish() {
    const missing = (questions ?? []).filter((q) => !(q.id in answers));
    if (missing.length) {
      setError(`${missing.length} madde yanıtlanmadı.`);
      const firstLevel = missing[0].level;
      const idx = levels.indexOf(firstLevel);
      if (idx >= 0) setLevelIdx(idx);
      return;
    }
    setError(null);
    await onComplete();
  }

  if (error && !questions) {
    return <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>;
  }
  if (!questions) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Maddeler yükleniyor…</div>;
  }
  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        7Q madde havuzu henüz yüklenmedi. Kısa süre içinde erişilebilir olacak.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Bölüm {levelIdx + 1} / {levels.length}
          </span>
          <span>
            {answeredCount} / {total} yanıtlandı{savingCount > 0 ? " · kaydediliyor…" : ""}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 md:p-8">
        <div className="text-xs tracking-[0.25em] text-accent">
          {SEVENQ_LEVEL_LABEL[currentLevel].toLocaleUpperCase("tr-TR")}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Her cümle için, o davranışın yaşamınızda ne sıklıkla yer aldığını işaretleyin.
        </p>

        <ol className="mt-8 space-y-8">
          {levelQuestions.map((q, i) => (
            <li key={q.id}>
              <div className="flex gap-3">
                <span className="mt-0.5 text-xs text-muted-foreground">{i + 1}.</span>
                <h2 className="font-serif text-xl leading-snug md:text-2xl">{q.text_tr}</h2>
              </div>
              <div className="mt-4 grid gap-2 pl-6">
                {SEVENQ_LIKERT.map((opt) => {
                  const active = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => answer(q.id, opt.value)}
                      className={`flex items-center justify-between rounded-md border px-4 py-2.5 text-left text-sm transition-colors ${
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
            </li>
          ))}
        </ol>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setLevelIdx(Math.max(0, levelIdx - 1))}
            disabled={levelIdx === 0}
            className="text-sm text-muted-foreground hover:text-accent disabled:opacity-40"
          >
            ← Önceki bölüm
          </button>
          {isLastLevel ? (
            <button
              type="button"
              onClick={finish}
              disabled={submitting || answeredCount < total}
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? "Hesaplanıyor…" : "Profili Oluştur"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!levelDone) {
                  setError("Bu bölümdeki tüm maddeleri yanıtlayın.");
                  return;
                }
                setError(null);
                setLevelIdx(levelIdx + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="btn-primary"
            >
              Sonraki bölüm →
            </button>
          )}
        </div>
        {error && <div className="mt-3 text-xs text-destructive">{error}</div>}
        <p className="mt-4 text-xs text-muted-foreground">
          Yanıtlarınız anında kaydedilir; yarıda bırakıp daha sonra devam edebilirsiniz.
        </p>
      </div>
    </div>
  );
}
