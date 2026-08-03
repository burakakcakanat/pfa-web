import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import {
  AGE_BANDS,
  AGE_BAND_LABEL,
  EDUCATION_LABEL,
  EDUCATION_LEVELS,
  GENDERS,
  GENDER_LABEL,
  OCCUPATION_FIELDS,
  OCCUPATION_LABEL,
  RESEARCH_CONSENT_VERSION,
  type Demographics,
  type ResearchConsentInput,
} from "@/lib/research-consent";

type Props = {
  value: ResearchConsentInput;
  onChange: (next: ResearchConsentInput) => void;
};

const FIELDS: { key: keyof Demographics; label: string; options: readonly string[]; labels: Record<string, string> }[] = [
  { key: "age_band", label: "Yaş aralığı", options: AGE_BANDS, labels: AGE_BAND_LABEL },
  { key: "gender", label: "Cinsiyet", options: GENDERS, labels: GENDER_LABEL },
  { key: "education", label: "Eğitim düzeyi", options: EDUCATION_LEVELS, labels: EDUCATION_LABEL },
  { key: "occupation_field", label: "Meslek alanı", options: OCCUPATION_FIELDS, labels: OCCUPATION_LABEL },
];

/**
 * Explicit, un-ticked research-use opt-in, separate from terms of service.
 * Refusing changes nothing about the respondent's own result.
 */
export function ResearchConsentBlock({ value, onChange }: Props) {
  const [text, setText] = useState<{ title: string; body_md: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("research_consent_versions")
        .select("title, body_md")
        .eq("version", RESEARCH_CONSENT_VERSION)
        .maybeSingle();
      if (data) setText(data as { title: string; body_md: string });
    })();
  }, []);

  const demographics = value.demographics ?? {};

  function setDemographic(key: keyof Demographics, next: string) {
    onChange({
      ...value,
      demographics: { ...demographics, [key]: next === "" ? null : next } as Demographics,
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="text-xs tracking-[0.25em] text-accent">ARAŞTIRMA KATKISI — İSTEĞE BAĞLI</div>
      <h3 className="mt-2 font-serif text-xl">{text?.title ?? "Araştırma kullanımı için açık rıza"}</h3>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-4 text-sm">
        <input
          type="checkbox"
          checked={value.research_consent}
          onChange={(e) =>
            onChange({ ...value, research_consent: e.target.checked, consent_version: RESEARCH_CONSENT_VERSION })
          }
          className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
        />
        <span>
          Madde düzeyindeki yanıtlarımın, <strong>kimliğimden arındırılmış</strong> biçimde ölçek geçerlik
          ve güvenilirlik çalışmalarında kullanılmasına onay veriyorum. Bunun isteğe bağlı olduğunu, onay
          vermemenin kendi raporumu ve hizmete erişimimi etkilemediğini, onayı dilediğim zaman Hesabım
          sayfasından geri çekebileceğimi biliyorum.
        </span>
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-xs text-accent underline-offset-2 hover:underline"
      >
        {open ? "Onam metnini kapat" : "Onam metninin tamamını oku"}
      </button>
      {open && text && (
        <div className="prose prose-sm mt-3 max-w-none rounded-md border border-border bg-background p-4 text-sm text-foreground/80">
          <ReactMarkdown>{text.body_md}</ReactMarkdown>
        </div>
      )}

      {value.research_consent && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm text-foreground/80">
            Aşağıdaki bilgiler yalnızca geçerlik çalışmasının katılımcı dağılımını tanımlamaya yarar.
            Tümü isteğe bağlıdır; boş bırakabilirsiniz.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="mb-1 block text-foreground/80">
                  {f.label} <span className="text-xs text-muted-foreground">(isteğe bağlı)</span>
                </span>
                <select
                  value={(demographics[f.key] as string | null | undefined) ?? ""}
                  onChange={(e) => setDemographic(f.key, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="">Seçilmedi</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {f.labels[o]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}