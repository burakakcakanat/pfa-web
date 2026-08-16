// Çok para birimli fiyat çözümlemesi ve paket eşleştirme.
// Tek doğruluk kaynağı: public.product_prices (products.price_cents geriye
// dönük uyumluluk için duruyor, yeni kod burayı okur).

export type Currency = "usd" | "try";

export type CurrencyPriceMap = Record<string, Partial<Record<Currency, number>>>;

/** Türkiye → TRY, diğer herkes → USD. */
export function resolveCurrency(hint?: {
  country?: string | null;
  locale?: string | null;
}): Currency {
  const country = (hint?.country ?? "").toUpperCase();
  if (country === "TR") return "try";
  const locale = (hint?.locale ?? "").toLowerCase();
  if (locale === "tr" || locale.startsWith("tr-") || locale.endsWith("-tr")) return "try";
  return "usd";
}

/** Tarayıcıda para birimi tahmini (dil listesi + saat dilimi). */
export function guessBrowserCurrency(): Currency {
  if (typeof window === "undefined") return "usd";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz === "Europe/Istanbul") return "try";
  } catch {
    /* yoksay */
  }
  const langs = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const l of langs) if (resolveCurrency({ locale: l }) === "try") return "try";
  return "usd";
}

/** İstenen para biriminde fiyat yoksa USD'ye düşer; o da yoksa null. */
export function priceFor(
  prices: CurrencyPriceMap,
  slug: string,
  currency: Currency,
): { cents: number; currency: Currency } | null {
  const row = prices[slug];
  if (!row) return null;
  const wanted = row[currency];
  if (typeof wanted === "number" && wanted > 0) return { cents: wanted, currency };
  const usd = row.usd;
  if (typeof usd === "number" && usd > 0) return { cents: usd, currency: "usd" };
  return null;
}

export function hasPriceIn(prices: CurrencyPriceMap, slug: string, currency: Currency): boolean {
  const v = prices[slug]?.[currency];
  return typeof v === "number" && v > 0;
}

export function fmtMoney(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "try" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: currency === "try" ? "TRY" : "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export type BundleShape = {
  slug: string;
  name_tr: string;
  book_key: string;
  includes_book: boolean;
  discount_percent: number;
  active: boolean;
  activate_at?: string | null;
  items: Array<{ product_slug: string; quantity: number }>;
};

/**
 * Seçilen ek ürün kümesine TAM olarak eşleşen aktif paketi bulur.
 * price_override_cents bilinçli olarak yok sayılır (tek para birimi varsayar);
 * indirim her zaman discount_percent üzerinden hesaplanır.
 */
export function matchBundleForSelection<T extends BundleShape>(
  bundles: T[],
  bookKey: string,
  selectedAddonSlugs: string[],
  now: number = Date.now(),
): T | null {
  if (selectedAddonSlugs.length === 0) return null;
  const wanted = [...new Set(selectedAddonSlugs)].sort().join("|");
  for (const b of bundles) {
    if (!b.active) continue;
    if (b.activate_at && new Date(b.activate_at).getTime() > now) continue;
    if (!b.includes_book) continue;
    if (b.book_key !== bookKey) continue;
    const have = [...new Set(b.items.map((i) => i.product_slug))].sort().join("|");
    if (have === wanted) return b;
  }
  return null;
}

/** Bu kitabı içeren aktif paketlerden türeyen "birlikte alın" seçenekleri. */
export function addonSlugsForBook<T extends BundleShape>(
  bundles: T[],
  bookKey: string,
  now: number = Date.now(),
): string[] {
  const out = new Set<string>();
  for (const b of bundles) {
    if (!b.active) continue;
    if (b.activate_at && new Date(b.activate_at).getTime() > now) continue;
    if (!b.includes_book || b.book_key !== bookKey) continue;
    for (const i of b.items) out.add(i.product_slug);
  }
  return [...out];
}

export function applyDiscount(subtotalCents: number, discountPercent: number): number {
  const pct = Math.max(0, Math.min(100, discountPercent || 0));
  return Math.round((subtotalCents * pct) / 100);
}
