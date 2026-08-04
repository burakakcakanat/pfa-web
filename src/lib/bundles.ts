// Paylaşılan fiyat çözümleme ve Amazon URL yardımcıları.
// Site, admin ve checkout aynı fonksiyonu kullanır.

export const AMAZON_DOMAINS: Record<string, string> = {
  us: "amazon.com",
  uk: "amazon.co.uk",
  de: "amazon.de",
  fr: "amazon.fr",
  es: "amazon.es",
  it: "amazon.it",
  nl: "amazon.nl",
  pl: "amazon.pl",
  se: "amazon.se",
  be: "amazon.com.be",
  ie: "amazon.ie",
  jp: "amazon.co.jp",
  br: "amazon.com.br",
  ca: "amazon.ca",
  mx: "amazon.com.mx",
  au: "amazon.com.au",
  in: "amazon.in",
};

export const MARKETPLACE_NAMES: Record<string, string> = {
  us: "Amerika Birleşik Devletleri",
  uk: "Birleşik Krallık",
  de: "Almanya",
  fr: "Fransa",
  es: "İspanya",
  it: "İtalya",
  nl: "Hollanda",
  pl: "Polonya",
  se: "İsveç",
  be: "Belçika",
  ie: "İrlanda",
  jp: "Japonya",
  br: "Brezilya",
  ca: "Kanada",
  mx: "Meksika",
  au: "Avustralya",
  in: "Hindistan",
};

export function amazonUrlFor(
  marketplace: string,
  asin: string | null,
  overrides: Record<string, string> = {},
): string | null {
  const override = overrides[marketplace];
  if (override) return override;
  if (!asin) return null;
  const domain = AMAZON_DOMAINS[marketplace];
  if (!domain) return null;
  return `https://${domain}/dp/${asin}`;
}

export const MARKETPLACE_NAMES_EN: Record<string, string> = {
  us: "United States",
  uk: "United Kingdom",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  nl: "Netherlands",
  pl: "Poland",
  se: "Sweden",
  be: "Belgium",
  ie: "Ireland",
  jp: "Japan",
  br: "Brazil",
  ca: "Canada",
  mx: "Mexico",
  au: "Australia",
  in: "India",
};

// Aktiflik kuralı: active && (activate_at IS NULL || activate_at <= now())
export function isLive(row: { active: boolean | null; activate_at?: string | null }): boolean {
  if (!row.active) return false;
  if (!row.activate_at) return true;
  return new Date(row.activate_at).getTime() <= Date.now();
}

// Kuruş bazında .90 son ekli en yakın değere yuvarla.
// round((c-90)/100)*100 + 90
export function roundToNinety(cents: number): number {
  return Math.round((cents - 90) / 100) * 100 + 90;
}

export type BundleForPricing = {
  pricing_mode: "locked_to_product" | "sum_minus_percent";
  locked_to_product_slug: string | null;
  discount_percent: number;
  price_override_cents: number | null;
  includes_book: boolean;
  book_key: string;
  items: Array<{ product_slug: string; quantity: number }>;
};

export type ProductPriceMap = Record<string, number>; // slug -> price_cents

/**
 * Bir paketin nihai kuruş fiyatını hesaplar.
 * @param bundle bundle satırı (+ items)
 * @param prices ürün slug → price_cents haritası (danismanlik-oturumu, tam-assessment-rapor, pfa-ebook-tr/en, hcd-ebook-en dâhil olmalı)
 * @param bookLang seçilen kitap dili (kitap dâhilse fiyatı bu dile göre eklenir)
 */
export function resolveBundlePrice(
  bundle: BundleForPricing,
  prices: ProductPriceMap,
  bookLang: "tr" | "en" = "tr",
): number {
  if (bundle.price_override_cents != null) return bundle.price_override_cents;

  if (bundle.pricing_mode === "locked_to_product") {
    const slug = bundle.locked_to_product_slug ?? "";
    return prices[slug] ?? 0;
  }

  // sum_minus_percent
  let sum = 0;
  for (const it of bundle.items) {
    sum += (prices[it.product_slug] ?? 0) * (it.quantity ?? 1);
  }
  if (bundle.includes_book) {
    const bookSlug = bookSlugFor(bundle.book_key, bookLang);
    sum += prices[bookSlug] ?? 0;
  }
  const discounted = sum * (1 - (bundle.discount_percent ?? 0) / 100);
  return roundToNinety(discounted);
}

export function bookSlugFor(bookKey: string, lang: "tr" | "en"): string {
  if (bookKey === "pfa") return lang === "tr" ? "pfa-ebook-tr" : "pfa-ebook-en";
  if (bookKey === "hcd") return "hcd-ebook-en";
  return "";
}

export function fmtUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}