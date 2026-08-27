import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PRIVACY_COPY } from "@/content/legal";
import {
  getMyPractitionerState,
  requestProLicense,
  submitPractitionerApplication,
  type MyPractitionerState,
} from "@/lib/practitioner-applications.functions";
import { getMyPractitionerRow, type MyPractitionerRow } from "@/lib/practitioners.functions";
import { PractitionerCard } from "@/components/practitioner-card";

const CATEGORIES = [
  { key: "terapotik", title: "Terapötik" },
  { key: "kocluk", title: "Koçluk" },
  { key: "pedagojik", title: "Pedagojik" },
  { key: "kurumsal", title: "Kurumsal" },
] as const;

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export function PractitionerAccountTab({ onGoToClients }: { onGoToClients?: () => void }) {
  const fetchState = useServerFn(getMyPractitionerState);
  const [state, setState] = useState<MyPractitionerState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState((await fetchState()) as MyPractitionerState);
    } catch (e: any) {
      setErr(e?.message ?? "Durum yüklenemedi.");
    }
  }, [fetchState]);
  useEffect(() => { load(); }, [load]);

  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!state) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  const app = state.application;

  // Red — zaman çizelgesi gösterilmez
  if (app && app.status === "red") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sonuç</div>
        <h2 className="mt-3 font-serif text-2xl">Başvurunuz bu dönem için olumlu sonuçlanmadı</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Programa gösterdiğiniz ilgi için teşekkür ederiz. Değerlendirme, dönemsel kontenjan ve
          program ölçütleri birlikte gözetilerek yapılır. PFA içeriklerini takip etmeye devam
          edebilirsiniz.
        </p>
        <Link to="/uygulayici-olun" className="mt-5 inline-block text-sm text-accent underline underline-offset-4">
          Program hakkında →
        </Link>
      </div>
    );
  }

  if (app) {
    return <PractitionerTimeline state={state} app={app} onGoToClients={onGoToClients} onChanged={load} />;
  }

  // STATE A — başvuru yok
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">PFA Uygulayıcı Programı</div>
        <h2 className="mt-3 font-serif text-2xl">Uygulayıcı Programı Başvurusu</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Program; hazırlık, uygulayıcı sınavı, değerlendirme görüşmesi ve sertifikasyon webinarı
          olmak üzere dört aşamadan oluşur. Başvuru için özgeçmiş (PDF) ve kısa bir niyet metni
          gereklidir.
        </p>
        <Link to="/uygulayici-olun" className="mt-4 inline-block text-sm text-accent underline underline-offset-4">
          Programın tüm detayları →
        </Link>
      </div>
      <ApplicationForm profile={state.profile} onSubmitted={load} />
    </div>
  );
}

type StepTone = "done" | "active" | "warn" | "future";

function PractitionerTimeline({
  state,
  app,
  onGoToClients,
  onChanged,
}: {
  state: MyPractitionerState;
  app: NonNullable<MyPractitionerState["application"]>;
  onGoToClients?: () => void;
  onChanged: () => void;
}) {
  const request = useServerFn(requestProLicense);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [badgeIntent, setBadgeIntent] = useState<"practitioner" | "fellow">("practitioner");

  const rank: Record<string, number> = {
    yeni: 0,
    incelemede: 1,
    belge_bekleniyor: 1,
    gorusme: 2,
    kabul: 3,
    red: 3,
  };
  const r = rank[app.status] ?? 0;
  const waitingDoc = app.status === "belge_bekleniyor";
  const accepted = app.status === "kabul";
  const hasLicense = state.hasProEntitlement;
  const licensePending = !hasLicense && !!state.licenseInquiry;

  async function startLicense() {
    setBusy(true);
    setErr(null);
    try {
      await request({ data: { badge_intent: badgeIntent } });
      onChanged();
    } catch (e: any) {
      setErr(e?.message ?? "Talep oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  const steps: Array<{ title: string; tone: StepTone; body?: React.ReactNode }> = [
    {
      title: "Başvuru alındı",
      tone: "done",
      body: <p className="text-muted-foreground">Gönderim tarihi: {fmtDate(app.created_at)}</p>,
    },
    {
      title: "Belge incelemesi",
      tone: waitingDoc ? "warn" : r >= 1 ? "done" : "active",
      body: waitingDoc ? (
        <div className="space-y-2">
          <p>Eksik ya da okunamayan bir belge nedeniyle ek belge bekleniyor.</p>
          {app.admin_note ? (
            <p className="whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 text-muted-foreground">
              {app.admin_note}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Belgeyi bilgilendirme e-postasını yanıtlayarak iletebilirsiniz.
          </p>
        </div>
      ) : undefined,
    },
    {
      title: "Değerlendirme görüşmesi",
      tone: r >= 2 ? "done" : r === 1 && !waitingDoc ? "active" : "future",
    },
    {
      title: "Kabul",
      tone: accepted || hasLicense ? "done" : "future",
    },
    {
      title: "Lisans",
      tone: hasLicense ? "done" : accepted ? "active" : "future",
      body: hasLicense ? (
        <div className="space-y-3">
          <p className="text-muted-foreground">Lisansınız tanımlı.</p>
          <div className="flex flex-wrap gap-3">
            {onGoToClients ? (
              <button
                type="button"
                onClick={onGoToClients}
                className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm text-accent-foreground"
              >
                Danışanlarım →
              </button>
            ) : null}
            <Link
              to="/uygulayicilar"
              className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm"
            >
              Uygulayıcı Rehberi
            </Link>
          </div>
        </div>
      ) : accepted ? (
        <div className="space-y-3">
          {licensePending ? (
            <p className="text-muted-foreground">
              Ödeme bildiriminiz alındı, onay bekleniyor. Ödeme yönergeleri e-posta ile iletilir.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Uygulayıcı paneliniz ve danışan ölçeği kotanız PFA-Pro lisansı ile açılır. Talebinizi
                ilettiğinizde ödeme yönergelerini e-posta ile paylaşırız.
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 text-sm text-foreground/85">
                  <input
                    type="radio"
                    name="badge_intent"
                    checked={badgeIntent === "practitioner"}
                    onChange={() => setBadgeIntent("practitioner")}
                    className="mt-1"
                  />
                  <span>PFA Practitioner</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-foreground/85">
                  <input
                    type="radio"
                    name="badge_intent"
                    checked={badgeIntent === "fellow"}
                    onChange={() => setBadgeIntent("fellow")}
                    className="mt-1"
                  />
                  <span>PFA Fellow (gelişim programı aboneliğiyle)</span>
                </label>
              </div>
              <button
                type="button"
                onClick={startLicense}
                disabled={busy}
                className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm text-accent-foreground disabled:opacity-60"
              >
                {busy ? "Gönderiliyor…" : "Lisansı Tamamla"}
              </button>
            </>
          )}
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </div>
      ) : undefined,
    },
    {
      title: "Sertifikasyon",
      tone: state.certificateStatus === "issued" ? "done" : hasLicense ? "active" : "future",
      body:
        state.certificateStatus === "issued" ? (
          <p className="text-muted-foreground">Sertifikanız düzenlendi.</p>
        ) : hasLikeCert(state) ? (
          <p className="text-muted-foreground">Sertifikasyon süreciniz devam ediyor.</p>
        ) : undefined,
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="text-xs uppercase tracking-[0.3em] text-accent">Uygulayıcı süreci</div>
      <h2 className="mt-3 font-serif text-2xl">Başvuru ve lisans yolculuğunuz</h2>

      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={[
              "rounded-md border p-4",
              s.tone === "done"
                ? "border-accent/60 bg-accent/5"
                : s.tone === "active"
                  ? "border-accent bg-accent/10 shadow-sm"
                  : s.tone === "warn"
                    ? "border-destructive/60 bg-destructive/5"
                    : "border-border opacity-60",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span
                className={[
                  "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                  s.tone === "done"
                    ? "border-accent bg-accent text-accent-foreground"
                    : s.tone === "warn"
                      ? "border-destructive text-destructive"
                      : s.tone === "active"
                        ? "border-accent text-accent"
                        : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {s.tone === "done" ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{s.title}</div>
                {s.body ? <div className="mt-2 space-y-2 text-sm">{s.body}</div> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3 text-sm">
        <span className="text-foreground">Rehber profili</span>
        <span className={state.directoryPublished ? "text-accent" : "text-muted-foreground"}>
          {state.directoryPublished ? "Yayında" : "Hazırlanıyor"}
        </span>
      </div>

      <MyGuideCardPreview />
    </div>
  );
}

/** Hesabım → Uygulayıcı: "Rehber kartım" — yayında olsun/olmasın önizleme. */
function MyGuideCardPreview() {
  const fetchRow = useServerFn(getMyPractitionerRow);
  const [row, setRow] = useState<MyPractitionerRow | null | undefined>(undefined);

  useEffect(() => {
    fetchRow()
      .then((r) => setRow(r as MyPractitionerRow | null))
      .catch(() => setRow(null));
  }, [fetchRow]);

  if (row === undefined) return null;
  if (!row) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Rehber kartım</div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            row.published ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
          }`}
        >
          {row.published ? "Yayında" : "Yayında değil"}
        </span>
      </div>
      <PractitionerCard p={row} linkToProfile={false} />
    </div>
  );
}

function hasLikeCert(state: MyPractitionerState) {
  return state.hasProEntitlement && state.certificateStatus !== "issued";
}

function ApplicationForm({
  profile,
  onSubmitted,
}: {
  profile: MyPractitionerState["profile"];
  onSubmitted: () => void;
}) {
  const submit = useServerFn(submitPractitionerApplication);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [motivationLen, setMotivationLen] = useState(0);
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set(
      "kvkk_accepted",
      (form.elements.namedItem("kvkk_accepted") as HTMLInputElement)?.checked ? "true" : "",
    );
    try {
      await submit({ data: fd });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message ?? "Başvuru gönderilemedi.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Ad Soyad" name="full_name" required maxLength={200} defaultValue={profile.full_name ?? ""} />
        <div className="flex flex-col">
          <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">E-posta</label>
          <input
            value={profile.email ?? ""}
            readOnly
            className="border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground"
          />
        </div>
        <Field label="Telefon (opsiyonel)" name="phone" type="tel" maxLength={60} />
        <Field label="Şehir" name="city" maxLength={120} />
        <div className="flex flex-col">
          <label className="mb-1.5 text-xs tracking-[0.2em] text-foreground/70">
            KATEGORİ <span className="text-destructive">*</span>
          </label>
          <select
            name="category"
            required
            defaultValue=""
            className="border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="" disabled>Seçiniz</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.title}</option>
            ))}
          </select>
        </div>
        <Field label="Mevcut unvan / meslek" name="profession_title" maxLength={200} />
        <Field label="Deneyim (yıl)" name="experience_years" type="number" min={0} max={80} />
      </div>

      <div className="flex flex-col">
        <label className="mb-1.5 text-xs tracking-[0.2em] text-foreground/70">
          NİYET METNİ <span className="text-destructive">*</span>{" "}
          <span className="ml-2 text-[10px] tracking-normal text-foreground/50">
            (200–1500 karakter · {motivationLen})
          </span>
        </label>
        <textarea
          name="motivation"
          required
          minLength={200}
          maxLength={1500}
          rows={7}
          onChange={(e) => setMotivationLen(e.target.value.length)}
          placeholder="Neden PFA uygulayıcı olmak istediğinizi kısaca aktarın."
          className="border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FileField label="Özgeçmiş (PDF, ≤10MB)" name="cv" accept="application/pdf" required />
        <FileField
          label="Diploma / sertifika (PDF/JPG, opsiyonel, ≤10MB)"
          name="diploma"
          accept="application/pdf,image/jpeg,image/png"
        />
      </div>

      <div className="pt-2">
        <label className="flex items-start gap-3 text-sm text-foreground/85">
          <input
            type="checkbox"
            name="kvkk_accepted"
            required
            checked={kvkkAccepted}
            onChange={(e) => setKvkkAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>
            Kişisel verilerimin başvuru değerlendirmesi amacıyla işlenmesini kabul ediyorum.{" "}
            <button
              type="button"
              onClick={() => setKvkkOpen((v) => !v)}
              className="underline underline-offset-4 text-accent"
            >
              {kvkkOpen ? "KVKK aydınlatma metnini kapat" : "KVKK aydınlatma metnini oku"}
            </button>
          </span>
        </label>

        {kvkkOpen ? (
          <div className="mt-3 rounded-md border border-border bg-muted/30">
            <div className="max-h-72 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-foreground/80">
              <h3 className="font-serif text-lg text-foreground">{PRIVACY_COPY.tr.h1}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{PRIVACY_COPY.tr.updated}</p>
              <p className="mt-3">{PRIVACY_COPY.tr.intro}</p>
              {PRIVACY_COPY.tr.sections.map((s) => (
                <div key={s.h2} className="mt-4">
                  <div className="text-sm font-medium text-foreground">{s.h2}</div>
                  {s.paras.map((p, i) => (
                    <p key={i} className="mt-1.5">{p}</p>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setKvkkAccepted(true);
                  setKvkkOpen(false);
                }}
                className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
              >
                Okudum, onaylıyorum
              </button>
              <button
                type="button"
                onClick={() => setKvkkOpen(false)}
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                Forma dön
              </button>
              <Link
                to="/gizlilik"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-muted-foreground underline underline-offset-4"
              >
                Yeni sekmede aç
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {status === "error" && error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="pt-1">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-2.5 text-sm text-accent-foreground transition hover:bg-accent/90 disabled:opacity-60"
        >
          {status === "sending" ? "Gönderiliyor…" : "Başvuruyu Gönder"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        {...rest}
        className="border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function FileField({
  label,
  name,
  accept,
  required,
}: {
  label: string;
  name: string;
  accept: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.2em] file:text-primary hover:file:bg-primary/20"
      />
    </div>
  );
}
