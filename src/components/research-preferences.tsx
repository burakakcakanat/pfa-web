import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyResearchProfile,
  saveMyDemographics,
  withdrawResearchConsent,
  grantResearchConsent,
} from "@/lib/research.functions";
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
} from "@/lib/research-consent";

const FIELDS: { key: keyof Demographics; label: string; options: readonly string[]; labels: Record<string, string> }[] = [
  { key: "age_band", label: "Yaş aralığı", options: AGE_BANDS, labels: AGE_BAND_LABEL },
  { key: "gender", label: "Cinsiyet", options: GENDERS, labels: GENDER_LABEL },
  { key: "education", label: "Eğitim düzeyi", options: EDUCATION_LEVELS, labels: EDUCATION_LABEL },
  { key: "occupation_field", label: "Meslek alanı", options: OCCUPATION_FIELDS, labels: OCCUPATION_LABEL },
];

export function ResearchPreferences() {
  const load = useServerFn(getMyResearchProfile);
  const saveDemo = useServerFn(saveMyDemographics);
  const withdraw = useServerFn(withdrawResearchConsent);
  const grant = useServerFn(grantResearchConsent);

  const [state, setState] = useState<Awaited<ReturnType<typeof getMyResearchProfile>> | null>(null);
  const [demo, setDemo] = useState<Demographics>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const s = await load();
    setState(s);
    setDemo((s.demographics ?? {}) as Demographics);
  }, [load]);

  useEffect(() => {
    reload().catch(() => setMsg("Bilgiler yüklenemedi."));
  }, [reload]);

  async function onWithdraw() {
    if (!window.confirm("Araştırma onamınızı geri çekmek üzeresiniz. Kayıtlarınız araştırma veri kümesinden çıkarılacak. Devam edilsin mi?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await withdraw();
      await reload();
      setMsg(`Onamınız geri çekildi. ${r.withdrawn_sessions} oturum araştırma veri kümesinden çıkarıldı.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Onam geri çekilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function onGrant() {
    setBusy(true);
    setMsg(null);
    try {
      await grant({ data: { consent_version: RESEARCH_CONSENT_VERSION } });
      await reload();
      setMsg("Onamınız kaydedildi. Teşekkürler.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Onam kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDemo() {
    setBusy(true);
    setMsg(null);
    try {
      await saveDemo({ data: demo });
      setMsg("Bilgiler kaydedildi.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl">Araştırma onamı</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu onam, kullanım koşullarını kabul etmenizden ayrıdır ve tamamen isteğe bağlıdır. Onam
          vermemek ya da geri çekmek raporlarınızı ve hizmete erişiminizi etkilemez.
        </p>

        <div className="mt-4 rounded-md border border-border bg-background p-4 text-sm">
          {state.consented ? (
            <>
              <div className="font-medium text-accent">Onam verildi</div>
              <div className="mt-1 text-muted-foreground">
                {state.consented_at ? new Date(state.consented_at).toLocaleString("tr-TR") : "—"}
                {state.consent_version ? ` · metin sürümü ${state.consent_version}` : ""}
                {` · ${state.session_count} oturum araştırma veri kümesinde`}
              </div>
            </>
          ) : (
            <>
              <div className="font-medium">Onam verilmedi</div>
              <div className="mt-1 text-muted-foreground">
                Yanıtlarınız hiçbir araştırma analizinde kullanılmıyor.
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          {state.consented ? (
            <button type="button" onClick={onWithdraw} disabled={busy} className="rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60">
              Onamı geri çek
            </button>
          ) : (
            <button type="button" onClick={onGrant} disabled={busy} className="btn-primary disabled:opacity-60">
              Araştırma kullanımına onay ver
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Geri çekildiğinde: tüm oturumlarınızda onam kapatılır, geri çekme zamanı işaretlenir ve
          kayıtlarınız kimliksiz araştırma yüzeyinden derhal çıkar. Kendi raporlarınız hesabınızda kalır.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl">Demografik bilgiler</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tümü isteğe bağlıdır; yalnızca geçerlik çalışmasının katılımcı dağılımını tanımlamak için kullanılır.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block text-foreground/80">{f.label}</span>
              <select
                value={(demo[f.key] as string | null | undefined) ?? ""}
                onChange={(e) =>
                  setDemo({ ...demo, [f.key]: e.target.value === "" ? null : e.target.value } as Demographics)
                }
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
        <button type="button" onClick={onSaveDemo} disabled={busy} className="btn-primary mt-4 disabled:opacity-60">
          Kaydet
        </button>
      </div>

      {msg && <p className="text-sm text-accent">{msg}</p>}
    </div>
  );
}