import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLicenseInquiry } from "@/lib/license-inquiries.functions";
import type { LicenseType } from "@/lib/license-inquiries";

export type LicenseFormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "number" | "textarea";
  required?: boolean;
  hint?: string;
  rows?: number;
  minLength?: number;
};

export type LicenseFormCopy = {
  commonHeading: string;
  specificHeading: string;
  messageLabel: string;
  messageHint: string;
  consentLabel: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  fields: LicenseFormField[];
};

const inputCls =
  "w-full rounded-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent";

const COMMON_FIELDS: LicenseFormField[] = [
  { name: "full_name", label: "Ad Soyad", required: true },
  { name: "email", label: "E-posta", type: "email", required: true },
  { name: "phone", label: "Telefon" },
  { name: "organisation", label: "Kurum / Şirket" },
  { name: "role", label: "Göreviniz" },
  { name: "country", label: "Ülke" },
  { name: "city", label: "Şehir" },
  { name: "website", label: "Web sitesi", type: "url" },
];

export function LicenseInquiryForm({
  type,
  copy,
}: {
  type: LicenseType;
  copy: LicenseFormCopy;
}) {
  const submit = useServerFn(submitLicenseInquiry);
  const [values, setValues] = useState<Record<string, string>>({});
  const [hp, setHp] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, v: string) => setValues((p) => ({ ...p, [name]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Devam etmek için onay kutusunu işaretlemeniz gerekir.");
      return;
    }
    setStatus("sending");
    try {
      const payload: Record<string, unknown> = { type, consent: true, website_hp: hp };
      for (const f of [...COMMON_FIELDS, ...copy.fields]) {
        const raw = (values[f.name] ?? "").trim();
        if (f.type === "number") {
          if (raw !== "") payload[f.name] = raw;
        } else {
          payload[f.name] = raw;
        }
      }
      payload.message = (values.message ?? "").trim();
      await submit({ data: payload as never });
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Başvuru gönderilemedi. Lütfen tekrar deneyin.");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-10 border border-accent/50 bg-accent/5 p-8 text-center">
        <h3 className="font-serif text-2xl">{copy.successTitle}</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground/75">
          {copy.successBody}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 border border-border bg-background p-6 md:p-10">
      {/* honeypot */}
      <input
        type="text"
        name="website_hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="text-[11px] tracking-[0.28em] text-accent">{copy.commonHeading}</div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {COMMON_FIELDS.map((f) => (
          <Field key={f.name} field={f} value={values[f.name] ?? ""} onChange={set} />
        ))}
      </div>

      <div className="mt-10 text-[11px] tracking-[0.28em] text-accent">
        {copy.specificHeading}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {copy.fields.map((f) => (
          <Field
            key={f.name}
            field={f}
            value={values[f.name] ?? ""}
            onChange={set}
            className={f.type === "textarea" ? "md:col-span-2" : undefined}
          />
        ))}
      </div>

      <div className="mt-8">
        <Field
          field={{
            name: "message",
            label: copy.messageLabel,
            type: "textarea",
            required: true,
            rows: 6,
            minLength: 30,
            hint: copy.messageHint,
          }}
          value={values.message ?? ""}
          onChange={set}
        />
      </div>

      <label className="mt-8 flex items-start gap-3 text-sm leading-relaxed text-foreground/75">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--color-accent,#C9A96A)]"
        />
        <span>{copy.consentLabel}</span>
      </label>

      {error ? (
        <p className="mt-5 border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-8 inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {status === "sending" ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}

function Field({
  field,
  value,
  onChange,
  className,
}: {
  field: LicenseFormField;
  value: string;
  onChange: (name: string, v: string) => void;
  className?: string;
}) {
  const id = `lf-${field.name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
        {field.label}
        {field.required ? <span className="text-accent"> *</span> : null}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          name={field.name}
          rows={field.rows ?? 4}
          required={field.required}
          minLength={field.minLength}
          maxLength={4000}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={inputCls}
        />
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.type ?? "text"}
          required={field.required}
          min={field.type === "number" ? 0 : undefined}
          maxLength={field.type === "number" ? undefined : 300}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={inputCls}
        />
      )}
      {field.hint ? (
        <p className="mt-1 text-[11px] leading-relaxed text-foreground/55">{field.hint}</p>
      ) : null}
    </div>
  );
}
