import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout } from "@/lib/checkout.functions";
import { usePaymentsEnabled } from "@/lib/use-payments-enabled";
import { PurchaseInquiryForm } from "@/components/purchase-inquiry-form";
import type { PurchaseInquiryKind } from "@/lib/purchase-inquiries";

type Props = {
  productSlug?: string;
  bundleSlug?: string;
  bookLang?: "tr" | "en";
  label?: string;
  className?: string;
  locale?: "tr" | "en";
  gift?: { recipient_name: string; recipient_email: string; gift_note?: string | null } | null;
  /**
   * Non-Paddle (havale) sales channel. When set and payments are disabled, the
   * button opens an inline enquiry form instead of showing "Yakında".
   * Only for products sold outside Paddle (sessions, live webinars, licences).
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

export function BuyButton({ productSlug, bundleSlug, bookLang, label = "Satın Al", className, locale = "tr", gift, inquiry, onSuccess }: Props) {
  const doCheckout = useServerFn(createCheckout);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentsEnabled = usePaymentsEnabled();

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
          ...(productSlug ? { product_slug: productSlug } : {}),
          ...(bundleSlug ? { bundle_slug: bundleSlug } : {}),
          ...(bookLang ? { book_lang: bookLang } : {}),
          origin: window.location.origin,
          ...(gift ? { gift } : {}),
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

  if (!paymentsEnabled) {
    // Products sold outside Paddle stay sellable today via enquiry + bank transfer.
    if (inquiry && locale === "tr") {
      return (
        <PurchaseInquiryForm
          kind={inquiry.kind}
          productSlug={productSlug ?? bundleSlug ?? "bilinmeyen"}
          productLabel={inquiry.productLabel}
          {...(inquiry.askSlot ? { askSlot: true } : {})}
          {...(inquiry.slotDefault ? { slotDefault: inquiry.slotDefault } : {})}
          {...(inquiry.buttonLabel ? { buttonLabel: inquiry.buttonLabel } : {})}
        />
      );
    }
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className={`${className ?? "btn-primary"} cursor-not-allowed opacity-50`}
        >
          {locale === "en" ? "Coming soon" : "Yakında"}
        </button>
        {locale === "en" ? (
          <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Online purchasing opens shortly. Until then you can write to us at{" "}
            <a
              href="mailto:info@psychofunctionalanalysis.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              info@psychofunctionalanalysis.com
            </a>
            .
          </span>
        ) : (
        <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Online satın alma yakında açılıyor. O zamana kadar{" "}
          <Link to="/iletisim" className="underline underline-offset-4 hover:text-foreground">
            iletişim
          </Link>{" "}
          sayfasından bize yazabilirsiniz.
        </span>
        )}
      </div>
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