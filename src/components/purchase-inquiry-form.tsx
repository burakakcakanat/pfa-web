import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitPurchaseInquiry } from "@/lib/purchase-inquiries.functions";
import { getAddonOffer } from "@/lib/offers.functions";
import type { AddonOffer } from "@/lib/offers";
import { fmtUsd } from "@/lib/bundles";
import { supabase } from "@/integrations/supabase/client";
import type { PurchaseInquiryKind } from "@/lib/purchase-inquiries";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getTransferQuote } from "@/lib/transfer.functions";
import type { TransferQuote } from "@/lib/purchase-inquiries";
import { fmtMoney } from "@/lib/pricing";
import { SessionSlotPicker } from "@/components/session-slot-picker";

type Props = {
  kind: PurchaseInquiryKind;
  selectionKind?: "product" | "bundle";
  intent?: "purchase" | "information";
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
  /** Signed e-book bought as a gift: asks for the recipient. */
  gift?: boolean;
  /** Helper line under the closed button. */
  hint?: string;
};

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";

export function PurchaseInquiryForm({
  kind,
  selectionKind = "product",
  intent = "purchase",
  productSlug,
  productLabel,
  askSlot = false,
  slotDefault = "",
  buttonLabel = "Başvuru / Randevu Talebi",
  className,
  locale = "tr",
  bookLang,
  offerAddon = true,
  gift = false,
  hint,
}: Props) {
  const submit = useServerFn(submitPurchaseInquiry);
  const fetchQuote = useServerFn(getTransferQuote);
  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const draftKey = `pfa.transfer.${selectionKind}.${productSlug}.${gift}`;
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
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rNote, setRNote] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setFullName(d.fullName ?? "");
        setPhone(d.phone ?? "");
        setSlot(d.slot ?? "");
        setMessage(d.message ?? "");
        setRName(d.rName ?? "");
        setREmail(d.rEmail ?? "");
        setRNote(d.rNote ?? "");
        setOpen(true);
      }
    } catch {}
    supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null);
      setEmail(data.user?.email ?? "");
      setAccountLoaded(true);
    });
  }, [draftKey]);
  useEffect(() => {
    if (
      !open ||
      !accountEmail ||
      intent === "information" ||
      ["corporate", "pro_license"].includes(kind)
    )
      return;
    let alive = true;
    setQuoteLoading(true);
    setError(null);
    fetchQuote({
      data: {
        slug: wantsAddon && offer ? offer.bundle_slug : productSlug,
        kind: wantsAddon && offer ? "bundle" : selectionKind,
        lang: effBookLang,
      },
    })
      .then((q) => {
        if (alive) setQuote(q);
      })
      .catch((e) => {
        if (alive) {
          setQuote(null);
          setError(e instanceof Error ? e.message : "Fiyat okunamadı.");
        }
      })
      .finally(() => {
        if (alive) setQuoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [
    open,
    accountEmail,
    intent,
    kind,
    productSlug,
    selectionKind,
    effBookLang,
    fetchQuote,
    wantsAddon,
    offer,
  ]);
  function saveDraft() {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ fullName, phone, slot, message, rName, rEmail, rNote }),
      );
    } catch {}
  }

  // One offer maximum, derived from a real bundle. Hidden when the signed-in
  // user already holds the add-on entitlement.
  useEffect(() => {
    if (!offerAddon || !open || gift) return;
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
          selection_kind: selectionKind,
          intent,
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
          gift: gift ? { recipient_name: rName, recipient_email: rEmail, gift_note: rNote } : null,
        },
      });
      sessionStorage.removeItem(draftKey);
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
          {quote?.ready
            ? "Havale tutarı ve banka bilgileri hesabınızdaki Taleplerim bölümünde hazır. Ödeme, banka hareketi kontrol edildikten sonra onaylanır."
            : "Talebiniz kaydedildi. Hazırlık tamamlanınca size bilgi vereceğiz; henüz ödeme yapmayın."}
        </p>
        <Button asChild className="mt-4">
          <Link to="/hesabim" search={{ tab: "waitlist" }}>
            Taleplerime git
          </Link>
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={`flex flex-col items-start gap-2 ${className ?? ""}`}>
        <Button type="button" onClick={() => setOpen(true)}>
          {buttonLabel}
        </Button>
        <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {hint ?? "Hesabınızdan takip edebilirsiniz."}
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
          aria-label="Adınız Soyadınız"
          placeholder="Adınız Soyadınız"
          className={inputCls}
        />
        <input
          required
          type="email"
          aria-label="Hesap e-postası"
          readOnly
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
        {gift ? (
          <div className="grid gap-3 rounded-md border border-accent/40 bg-accent/5 p-3">
            <div className="text-xs tracking-[0.2em] text-accent">HEDİYE ALICISI</div>
            <input
              required
              value={rName}
              onChange={(e) => setRName(e.target.value)}
              aria-label="Hediye alıcısının adı"
              placeholder="Alıcının adı soyadı (kitap bu isme imzalanır)"
              className={inputCls}
            />
            <input
              required
              type="email"
              value={rEmail}
              onChange={(e) => setREmail(e.target.value)}
              aria-label="Hediye alıcısının e-postası"
              placeholder="Alıcının e-postası"
              className={inputCls}
            />
            <textarea
              rows={2}
              maxLength={500}
              value={rNote}
              onChange={(e) => setRNote(e.target.value)}
              placeholder="Hediye notunuz (opsiyonel)"
              className={inputCls}
            />
          </div>
        ) : null}
        {askSlot ? <SessionSlotPicker value={slot} onChange={setSlot} locale={locale} /> : null}
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

      {offer && selectionKind === "product" ? (
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
                {fmtUsd(offer.separate_price_cents)} separately ({fmtUsd(offer.saving_cents)} less).
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

      {quoteLoading && (
        <p className="mt-4 text-sm text-muted-foreground">Güncel tutar hesaplanıyor…</p>
      )}
      {quote && (
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <span>Ürün / paket</span>
            <strong>{fmtMoney(quote.subtotalCents, "try")}</strong>
          </div>
          {quote.discountCents > 0 && (
            <div className="flex justify-between gap-4 text-accent">
              <span>Bekleme listesi indirimi · %10</span>
              <strong>−{fmtMoney(quote.discountCents, "try")}</strong>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span>Ödenecek tutar</span>
            <strong>{fmtMoney(quote.totalCents, "try")}</strong>
          </div>
          {quote.reason && <p className="text-muted-foreground">{quote.reason}</p>}
        </div>
      )}
      {!accountEmail ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Talebinizi ve teslimatı takip etmek için hesabınıza giriş yapın.
          </p>
          <Button asChild disabled={!accountLoaded}>
            <Link
              to="/auth"
              search={{
                redirect:
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : "/kitaplar",
              }}
              onClick={saveDraft}
            >
              Giriş yap / hesap aç
            </Link>
          </Button>
        </div>
      ) : (
        <Button
          type="submit"
          disabled={
            busy ||
            quoteLoading ||
            (!quote && intent === "purchase" && !["corporate", "pro_license"].includes(kind))
          }
          className="mt-4"
        >
          {busy
            ? "Kaydediliyor…"
            : quote?.ready
              ? "Tutarı onayla ve havale bilgilerini göster"
              : "Talebimi kaydet"}
        </Button>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {quote?.ready
          ? "Havale, banka hareketi kontrol edildikten sonra onaylanır."
          : "Hazırlık tamamlanmadan ödeme yapmayın."}
      </p>
    </form>
  );
}
