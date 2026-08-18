import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout } from "@/lib/checkout.functions";
import { PAYMENTS_LIVE, BANK_TRANSFER_ONLY_SLUG } from "@/lib/payments-config";
import { usePaymentMode } from "@/lib/payment-mode";
import { guessBrowserCurrency } from "@/lib/pricing";
import { PurchaseInquiryForm } from "@/components/purchase-inquiry-form";
import type { PurchaseInquiryKind } from "@/lib/purchase-inquiries";

type Props = {
  productSlug: string;
  label?: string;
  className?: string;
  locale?: "tr" | "en";
  /**
   * Havale (purchase_inquiries) akışı. YALNIZCA uygulayıcı lisansı
   * (`pfa-pro-lisans-paketi`) için geçerlidir; diğer ürünlerde kartlı ödeme.
   */
  inquiry?: {
    kind: PurchaseInquiryKind;
    productLabel: string;
    askSlot?: boolean;
    slotDefault?: string;
    buttonLabel?: string;
  } | null;
  onSuccess?: () => void;
};

export function BuyButton({
  productSlug,
  label = "Satın Al",
  className,
  locale = "tr",
  inquiry,
  onSuccess,
}: Props) {
  const doCheckout = useServerFn(startCheckout);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentMode = usePaymentMode();
  const [channel, setChannel] = useState<"transfer" | "card">("transfer");

  const bankTransferOnly = productSlug === BANK_TRANSFER_ONLY_SLUG;

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: window.location.pathname } });
        return;
      }
      const res = await doCheckout({
        data: {
          product_slug: productSlug,
          currency: guessBrowserCurrency(),
          origin: window.location.origin,
        },
      });
      if (res?.url) {
        onSuccess?.();
        window.location.href = res.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : locale === "en" ? "Something went wrong." : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  const transferForm =
    bankTransferOnly && inquiry ? (
      <PurchaseInquiryForm
        kind={inquiry.kind}
        productSlug={productSlug}
        productLabel={inquiry.productLabel}
        {...(inquiry.askSlot ? { askSlot: true } : {})}
        {...(inquiry.slotDefault ? { slotDefault: inquiry.slotDefault } : {})}
        {...(inquiry.buttonLabel ? { buttonLabel: inquiry.buttonLabel } : {})}
      />
    ) : null;

  const cardPath = !PAYMENTS_LIVE ? (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`${className ?? "btn-primary"} cursor-not-allowed opacity-50`}
      >
        {locale === "en" ? "Coming soon" : "Çok Yakında"}
      </button>
      <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        {locale === "en"
          ? "Card payment is being set up; it will be available here shortly."
          : "Kart ile ödeme hazırlanıyor; kısa süre içinde buradan aktif olacak."}
      </span>
    </div>
  ) : (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={className ?? "btn-primary hover:btn-primary-hover disabled:opacity-60"}
      >
        {loading ? "..." : label}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );

  // Havale akışı yalnızca uygulayıcı lisansında tanımlı; site genelindeki
  // payment_mode ayarı hangi kanalın görüneceğine karar verir.
  if (transferForm && paymentMode === "bank_transfer") return transferForm;

  if (transferForm && paymentMode === "both") {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-wrap gap-2">
          {(["transfer", "card"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                channel === c ? "border-accent text-accent" : "border-border text-muted-foreground"
              }`}
            >
              {c === "transfer"
                ? locale === "en"
                  ? "Bank transfer"
                  : "Havale / EFT"
                : locale === "en"
                  ? "Pay by card"
                  : "Kart ile ödeme"}
            </button>
          ))}
        </div>
        {channel === "transfer" ? transferForm : cardPath}
      </div>
    );
  }

  return cardPath;
}
