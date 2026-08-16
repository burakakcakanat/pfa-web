import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout } from "@/lib/checkout.functions";
import { PAYMENTS_LIVE, BANK_TRANSFER_ONLY_SLUG } from "@/lib/payments-config";
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

  // Havale yalnızca uygulayıcı lisansında kalır.
  if (bankTransferOnly && inquiry) {
    return (
      <PurchaseInquiryForm
        kind={inquiry.kind}
        productSlug={productSlug}
        productLabel={inquiry.productLabel}
        {...(inquiry.askSlot ? { askSlot: true } : {})}
        {...(inquiry.slotDefault ? { slotDefault: inquiry.slotDefault } : {})}
        {...(inquiry.buttonLabel ? { buttonLabel: inquiry.buttonLabel } : {})}
      />
    );
  }

  if (!PAYMENTS_LIVE) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`${className ?? "btn-primary"} cursor-not-allowed opacity-50`}
      >
        {locale === "en" ? "Coming soon" : "Çok Yakında"}
      </button>
    );
  }

  return (
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
}
