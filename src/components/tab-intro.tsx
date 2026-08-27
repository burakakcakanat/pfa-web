// Sekme girişi — tek satır açıklama + isteğe bağlı akış şeridi (pill dizisi).
// Yalnızca sunum katmanı; veri veya mantık içermez.
import { ChevronRight } from "lucide-react";

export function TabIntro({ text, steps }: { text: string; steps?: string[] }) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {steps && steps.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[0.65rem] tracking-[0.06em] text-foreground/80">
                {s}
              </span>
              {i < steps.length - 1 ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
