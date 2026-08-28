// PFA BSÖ akışının ilk adımı: kompakt araştırma onamı + isteğe bağlı demografi.
// Onam vermeden de devam edilebilir; puanlama mantığına dokunulmaz.
import { ResearchConsentBlock } from "@/components/research-consent-block";
import type { ResearchConsentInput } from "@/lib/research-consent";

export function ResearchConsentStep({
  value,
  onChange,
  onContinue,
  title = "Başlamadan önce",
}: {
  value: ResearchConsentInput;
  onChange: (v: ResearchConsentInput) => void;
  onContinue: () => void;
  title?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Adım 1 / 2</div>
        <h2 className="mt-2 font-serif text-2xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Onay vermek zorunlu değildir; vermeden de ölçeği doldurup sonucunuzu görebilirsiniz.
        </p>
        <div className="mt-5">
          <ResearchConsentBlock value={value} onChange={onChange} />
        </div>
        <button type="button" onClick={onContinue} className="btn-primary mt-6">
          Ölçeğe başla
        </button>
      </div>
    </div>
  );
}
