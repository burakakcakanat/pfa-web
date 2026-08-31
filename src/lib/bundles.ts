// Paylaşılan fiyat çözümleme ve Amazon URL yardımcıları.
// Site, admin ve checkout aynı fonksiyonu kullanır.
import type { Currency, CurrencyPriceMap } from "@/lib/pricing";

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

// Kuruş/cent bazında .90 son ekli en yakın değere yuvarla.
// round((c-90)/100)*100 + 90 — TÜM para birimlerinde ve TÜM yüzeylerde geçerli.
export function roundToNinety(cents: number): number {
  const v = Math.round((cents - 90) / 100) * 100 + 90;
  return Math.max(90, v);
}

/**
 * Paket fiyat girdisi. `pricing_mode`, `locked_to_product_slug` ve
 * `price_override_cents` KULLANIM DIŞIDIR (kolonlar tabloda duruyor ama fiyat
 * hesabına girmez): tüm paketler bileşen toplamı − indirim modelindedir.
 */
export type BundleForPricing = {
  pricing_mode?: string | null;
  locked_to_product_slug?: string | null;
  discount_percent: number;
  price_override_cents?: number | null;
  includes_book: boolean;
  book_key: string;
  items: Array<{ product_slug: string; quantity: number }>;
};

export type ProductPriceMap = Record<string, number>; // slug -> price_cents

/** Paketin teslim ettiği tüm ürünler (kitap sürümü dâhil). */
export function bundleComponents(
  bundle: BundleForPricing,
  bookLang: "tr" | "en" = "tr",
): Array<{ slug: string; quantity: number }> {
  const out = bundle.items.map((i) => ({
    slug: i.product_slug,
    quantity: i.quantity ?? 1,
  }));
  if (bundle.includes_book) {
    const bookSlug = bookSlugFor(bundle.book_key, bookLang);
    if (bookSlug) out.push({ slug: bookSlug, quantity: 1 });
  }
  return out;
}

function clampPct(pct: number): number {
  return Math.max(0, Math.min(100, pct || 0));
}

/**
 * KANONİK paket fiyatı — site, admin ve checkout aynı fonksiyonu çağırır.
 * taban = Σ(bileşen fiyatı × adet, istenen para biriminde) → − indirim → .90 yuvarlama.
 * Bir bileşenin o para biriminde fiyatı yoksa USD'ye düşer; USD de yoksa null
 * döner (eksik toplamla asla fiyat basılmaz).
 */
export function resolveBundlePriceInCurrency(
  bundle: BundleForPricing,
  prices: CurrencyPriceMap,
  currency: Currency,
  bookLang: "tr" | "en" = "tr",
): { cents: number; currency: Currency } | null {
  const comps = bundleComponents(bundle, bookLang);
  if (comps.length === 0) return null;

  const sumIn = (c: Currency): number | null => {
    let sum = 0;
    for (const it of comps) {
      const v = prices[it.slug]?.[c];
      if (typeof v !== "number" || v <= 0) return null;
      sum += v * it.quantity;
    }
    return sum;
  };

  let ccy: Currency = currency;
  let sum = sumIn(ccy);
  if (sum == null && currency !== "usd") {
    ccy = "usd";
    sum = sumIn("usd");
  }
  if (sum == null) return null;

  return { cents: roundToNinety(sum * (1 - clampPct(bundle.discount_percent) / 100)), currency: ccy };
}

/**
 * Tek para birimli (USD) sarmalayıcı — sunucu tarafı eski çağrılar için.
 * Kanonik fonksiyonu çağırır; fiyat çözülemezse 0 döner.
 */
export function resolveBundlePrice(
  bundle: BundleForPricing,
  prices: ProductPriceMap,
  bookLang: "tr" | "en" = "tr",
): number {
  const map: CurrencyPriceMap = {};
  for (const [slug, cents] of Object.entries(prices)) map[slug] = { usd: cents };
  return resolveBundlePriceInCurrency(bundle, map, "usd", bookLang)?.cents ?? 0;
}

export function bookSlugFor(bookKey: string, lang: "tr" | "en"): string {
  if (bookKey === "pfa") return lang === "tr" ? "pfa-ebook-tr" : "pfa-ebook-en";
  if (bookKey === "hcd") return "hcd-ebook-en";
  return "";
}

export function fmtUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}