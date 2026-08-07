import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitPurchaseInquiry } from "@/lib/purchase-inquiries.functions";
import { getAddonOffer } from "@/lib/offers.functions";
import type { AddonOffer } from "@/lib/offers";
import { fmtUsd } from "@/lib/bundles";
import { supabase } from "@/integrations/supabase/client";
import type { PurchaseInquiryKind } from "@/lib/purchase-inquiries";
import { SessionSlotPicker } from "@/components/session-slot-picker";

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
  /** Origin locale of the page rendering the form. */
  locale?: "tr" | "en";
  /** Book edition language used when the offer includes a signed copy. */
  bookLang?: "tr" | "en";
  /** Set false to suppress the optional package add-on (e.g. free flows). */
  offerAddon?: boolean;
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
  locale = "tr",
  bookLang,
  offerAddon = true,
}: Props) {
  const submit = useServerFn(submitPurchaseInquiry);
  const fetchOffer = useServerFn(getAddonOffer);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [offer, setOffer] = useState<AddonOffer | null>(null);
  const [wantsAddon, setWantsAddon] = useState(false);
  const effBookLang = bookLang ?? locale;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState(slotDefault);
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");

  // One offer maximum, derived from a real bundle. Hidden when the signed-in
  // user already holds the add-on entitlement.
  useEffect(() => {
    if (!offerAddon || !open) return;
    let alive = true;
    (async () => {
      try {
        const o = await fetchOffer({
          data: { product_slug: productSlug, book_lang: effBookLang, locale },
        });
        if (!alive || !o) return;
        const { data: userRes } = await supabase.auth.getUser();
        if (userRes.user) {
          const { data: ents } = await supabase
            .from("user_entitlements")
            .select("type")
            .in("type", o.addon_entitlement_types);
          if ((ents ?? []).length > 0) return;
        }
        if (alive) setOffer(o);
      } catch {
        /* the offer is optional — never block the request form */
      }
    })();
    return () => {
      alive = false;
    };
  }, [offerAddon, open, productSlug, effBookLang, locale, fetchOffer]);

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
          locale,
          book_lang: effBookLang,
          addon_bundle_slug: wantsAddon && offer ? offer.bundle_slug : null,
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
          <SessionSlotPicker value={slot} onChange={setSlot} locale={locale} />
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

      {offer ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/25 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={wantsAddon}
            onChange={(e) => setWantsAddon(e.target.checked)}
          />
          <span className="leading-relaxed text-foreground/80">
            {locale === "en" ? (
              <>
                Add {offer.addon_label} as a package —{" "}
                <strong>{fmtUsd(offer.bundle_price_cents)}</strong> instead of{" "}
                {fmtUsd(offer.separate_price_cents)} separately (
                {fmtUsd(offer.saving_cents)} less).
              </>
            ) : (
              <>
                Pakete {offer.addon_label} ekleyin —{" "}
                <strong>{fmtUsd(offer.bundle_price_cents)}</strong>; ayrı ayrı{" "}
                {fmtUsd(offer.separate_price_cents)}, {fmtUsd(offer.saving_cents)} tasarruf.
              </>
            )}
          </span>
        </label>
      ) : null}

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