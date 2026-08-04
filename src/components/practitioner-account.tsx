import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getMyPractitionerState,
  submitPractitionerApplication,
  type MyPractitionerState,
} from "@/lib/practitioner-applications.functions";

const CATEGORIES = [
  { key: "terapotik", title: "Terapötik" },
  { key: "kocluk", title: "Koçluk" },
  { key: "pedagojik", title: "Pedagojik" },
  { key: "kurumsal", title: "Kurumsal" },
] as const;

const STATUS_STEPS = ["Alındı", "İncelemede", "Görüşme"] as const;

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

  // STATE E — pro rolü var
  if (state.isPro) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Uygulayıcı</div>
        <h2 className="mt-3 font-serif text-2xl">Uygulayıcı panelinize hoş geldiniz</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Danışan davetlerinizi ve raporlarını “Danışanlarım” sekmesinden yönetebilirsiniz.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {onGoToClients ? (
            <button
              type="button"
              onClick={onGoToClients}
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm text-accent-foreground"
            >
              Danışanlarım →
            </button>
          ) : null}
          <Link to="/uygulayicilar" className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm">
            Uygulayıcı Rehberi
          </Link>
        </div>
        {state.practitioner && !state.practitioner.published ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Rehber profiliniz hazırlanıyor; yayına alındığında bilgilendirileceksiniz.
          </p>
        ) : null}
      </div>
    );
  }

  const app = state.application;

  // STATE D — kabul, ama henüz pro değil
  if (app && app.status === "kabul") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs tracking-[0.3em] text-accent">KABUL EDİLDİ</div>
        <h2 className="mt-3 font-serif text-2xl">Uygulayıcı Profilinizi Oluşturuyoruz</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Başvurunuz kabul edildi. Uygulayıcı profiliniz hazırlanıyor; süreçle ilgili olarak
          ekibimiz kısa süre içinde sizinle e-posta üzerinden iletişime geçecek.
        </p>
      </div>
    );
  }

  // STATE C — red
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

  // STATE B — süreçte
  if (app) {
    const stepIndex = app.status === "yeni" ? 0 : app.status === "incelemede" ? 1 : 2;
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Başvuru durumu</div>
        <h2 className="mt-3 font-serif text-2xl">Başvurunuz değerlendiriliyor</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gönderim tarihi: {fmtDate(app.created_at)}
        </p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {STATUS_STEPS.map((label, i) => {
            const done = i <= stepIndex;
            return (
              <li
                key={label}
                className={`rounded-md border p-4 ${done ? "border-accent bg-accent/10" : "border-border"}`}
              >
                <div className={`text-[11px] uppercase tracking-[0.2em] ${done ? "text-accent" : "text-muted-foreground"}`}>
                  Adım {i + 1}
                </div>
                <div className="mt-1 text-sm">{label}</div>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-sm text-muted-foreground">
          Değerlendirme yaklaşık 1–2 hafta içinde e-posta ile iletilir. Bu aşamada başvurunuzda
          değişiklik yapılamaz.
        </p>
      </div>
    );
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

      <label className="flex items-start gap-3 pt-2 text-sm text-foreground/85">
        <input type="checkbox" name="kvkk_accepted" required className="mt-1 h-4 w-4 accent-primary" />
        <span>
          Kişisel verilerimin başvuru değerlendirmesi amacıyla işlenmesini kabul ediyorum.{" "}
          <Link to="/gizlilik" className="underline underline-offset-4">KVKK aydınlatma metni</Link>
        </span>
      </label>

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
