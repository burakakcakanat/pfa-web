import { resolveBundlePriceInCurrency, type BundleForPricing } from "@/lib/bundles";
import type { CurrencyPriceMap } from "@/lib/pricing";
import { waitlistDiscountCents } from "@/lib/waitlist";

export function transferTotal(
  prices: CurrencyPriceMap,
  slug: string,
  bundle: BundleForPricing | null,
  lang: "tr" | "en",
  eligible: boolean,
  pct: number,
) {
  const resolved = bundle
    ? resolveBundlePriceInCurrency(bundle, prices, "try", lang)
    : { cents: prices[slug]?.try ?? 0, currency: "try" as const };
  if (!resolved || resolved.currency !== "try" || resolved.cents <= 0) return null;
  const discountCents = waitlistDiscountCents(resolved.cents, {
    productSlug: slug,
    hasActiveWaitlist: eligible,
    pct,
    hasAddons: !!bundle,
  });
  return {
    subtotalCents: resolved.cents,
    discountCents,
    totalCents: resolved.cents - discountCents,
    currency: "try" as const,
  };
}

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES = ["application/pdf", "image/png", "image/jpeg"];
export function validReceipt(size: number, type: string) {
  return size > 0 && size <= RECEIPT_MAX_BYTES && RECEIPT_TYPES.includes(type);
}
