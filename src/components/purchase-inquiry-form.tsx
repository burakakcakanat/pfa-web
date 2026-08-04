import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitPurchaseInquiry } from "@/lib/purchase-inquiries.functions";
import type { PurchaseInquiryKind } from "@/lib/purchase-inquiries";

type Props = {
  kind: PurchaseInquiryKind;
  productSlug: string;
  productLabel: string;
  /** Ask for a preferred date/time (birebir seanslar). */
  askSlot?: boolean;
  /** Pre-filled preferred date/time text. */
  slotDefault?: string;
  buttonLabel?: string;
  className?: string;
};

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";

export function PurchaseInquiryForm({
  kind,
  productSlug,
  productLabel,
  askSlot = false,
  slotDefault = "",
  buttonLabel = "Başvuru / Randevu Talebi",
  className,
}: Props) {
  const submit = useServerFn(submitPurchaseInquiry);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState(slotDefault);
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await submit({
        data: {
          kind,
          product_slug: productSlug,
          product_label: productLabel,
          full_name: fullName,
          email,
          phone,
          preferred_slot: askSlot ? slot || slotDefault : slotDefault,
          message,
          website_hp: hp,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={`rounded-md border border-accent/50 bg-accent/10 p-5 ${className ?? ""}`}>
        <div className="font-serif text-lg">Talebiniz alındı.</div>
        <p className="mt-2 text-sm text-foreground/80">
          En geç 24 saat içinde e-posta ile size dönüş yapacağız; katılım ve ödeme adımlarını
          birlikte netleştireceğiz.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={`flex flex-col items-start gap-2 ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary hover:btn-primary-hover"
        >
          {buttonLabel}
        </button>
        <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Kısa formu doldurun; 24 saat içinde dönüş yapıp ayrıntıları birlikte netleştirelim.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`w-full max-w-xl rounded-md border border-border bg-card p-5 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.25em] text-accent">TALEP FORMU</div>
          <div className="mt-1 font-serif text-lg">{productLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          Kapat
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Adınız Soyadınız"
          className={inputCls}
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta"
          className={inputCls}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefon (opsiyonel)"
          className={inputCls}
        />
        {askSlot ? (
          <input
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder="Tercih ettiğiniz gün / saat (örn. hafta içi 15:00 sonrası)"
            className={inputCls}
          />
        ) : null}
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mesajınız (opsiyonel)"
          className={inputCls}
        />
        {/* honeypot */}
        <input
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary mt-4 hover:btn-primary-hover disabled:opacity-60"
      >
        {busy ? "Gönderiliyor…" : "Talebi Gönder"}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Ödeme bu sayfada alınmaz. Talebinizi aldıktan sonra size özel olarak dönüş yapılır.
      </p>
    </form>
  );
}