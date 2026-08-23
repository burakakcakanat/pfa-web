// Server-only resolution of the add-on offer. Reuses bundles + bundle_items and
// the shared price resolver; no separate discount table exists.
import {
  bookSlugFor,
  isLive,
  resolveBundlePrice,
  type BundleForPricing,
  type ProductPriceMap,
} from "@/lib/bundles";
import {
  ADDON_BUNDLE_FOR_PRODUCT,
  entitlementTypeForSlug,
  type AddonOffer,
  type EntitlementTypeName,
} from "@/lib/offers";

export type BundleComponent = { product_slug: string; quantity: number };

export type BundleShape = {
  slug: string;
  name_tr: string;
  name_en: string | null;
  book_key: string;
  includes_book: boolean;
  pricing_mode: "locked_to_product" | "sum_minus_percent";
  locked_to_product_slug: string | null;
  discount_percent: number;
  price_override_cents: number | null;
  active: boolean;
  activate_at: string | null;
  items: BundleComponent[];
};

export async function loadBundle(slug: string): Promise<BundleShape | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bundles")
    .select(
      "id, slug, name_tr, name_en, book_key, includes_book, pricing_mode, locked_to_product_slug, discount_percent, price_override_cents, active, activate_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: items } = await supabaseAdmin
    .from("bundle_items")
    .select("product_slug, quantity")
    .eq("bundle_id", (data as { id: string }).id);
  return {
    ...(data as unknown as Omit<BundleShape, "items">),
    items: (items ?? []) as unknown as BundleComponent[],
  };
}

export async function priceMapFor(slugs: string[]): Promise<ProductPriceMap> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await supabaseAdmin
    .from("products")
    .select("slug, price_cents")
    .in("slug", unique);
  const out: ProductPriceMap = {};
  for (const p of data ?? []) out[p.slug as string] = (p.price_cents as number) ?? 0;
  return out;
}

/** Every product slug a bundle delivers, including the book edition. */
export function bundleComponentSlugs(b: BundleShape, bookLang: "tr" | "en"): string[] {
  const slugs = b.items.map((i) => i.product_slug);
  if (b.includes_book) {
    const bookSlug = bookSlugFor(b.book_key, bookLang);
    if (bookSlug) slugs.push(bookSlug);
  }
  return slugs;
}

export async function bundlePriceCents(
  b: BundleShape,
  bookLang: "tr" | "en",
): Promise<{ bundle: number; separate: number; prices: ProductPriceMap }> {
  const slugs = bundleComponentSlugs(b, bookLang);
  const prices = await priceMapFor([...slugs, b.locked_to_product_slug ?? ""]);
  const forPricing: BundleForPricing = {
    pricing_mode: b.pricing_mode,
    locked_to_product_slug: b.locked_to_product_slug,
    discount_percent: b.discount_percent,
    price_override_cents: b.price_override_cents,
    includes_book: b.includes_book,
    book_key: b.book_key,
    items: b.items,
  };
  const bundle = resolveBundlePrice(forPricing, prices, bookLang);
  const separate = slugs.reduce((sum, s) => sum + (prices[s] ?? 0), 0);
  return { bundle, separate, prices };
}

const ADDON_LABEL_TR: Record<string, string> = {
  ebook: "adınıza imzalı dijital kitap",
  assessment_full: "tam PFA Bilinç Seviyeleri Ölçeği ve bilinç seviyesi raporu",
  session: "birebir danışmanlık oturumu",
  webinar_bsc: "Bilinç Seviyeleri Çalışmaları kaydı",
  pfa_pro: "PFA-Pro lisansı",
};

const ADDON_LABEL_EN: Record<string, string> = {
  ebook: "a digital copy signed to your name",
  assessment_full: "the full PFA Assessment and consciousness-level report",
  session: "a one-to-one session",
  webinar_bsc: "the Levels of Consciousness workshop",
  pfa_pro: "a PFA-Pro licence",
};

export async function resolveAddonOffer(
  productSlug: string,
  bookLang: "tr" | "en",
  locale: "tr" | "en",
): Promise<AddonOffer | null> {
  const bundleSlug = ADDON_BUNDLE_FOR_PRODUCT[productSlug];
  if (!bundleSlug) return null;
  const bundle = await loadBundle(bundleSlug);
  if (!bundle || !isLive(bundle)) return null;

  const componentSlugs = bundleComponentSlugs(bundle, bookLang);
  if (!componentSlugs.includes(productSlug)) return null;

  const extras = componentSlugs.filter((s) => s !== productSlug);
  const types = Array.from(
    new Set(
      extras
        .map((s) => entitlementTypeForSlug(s))
        .filter((t): t is EntitlementTypeName => t !== null),
    ),
  );
  if (types.length === 0) return null;

  const { bundle: bundleCents, separate } = await bundlePriceCents(bundle, bookLang);
  if (bundleCents <= 0) return null;

  const labels = locale === "en" ? ADDON_LABEL_EN : ADDON_LABEL_TR;
  return {
    bundle_slug: bundle.slug,
    bundle_label: (locale === "en" ? bundle.name_en : bundle.name_tr) || bundle.name_tr,
    addon_label: types.map((t) => labels[t] ?? t).join(", "),
    bundle_price_cents: bundleCents,
    separate_price_cents: separate,
    saving_cents: Math.max(0, separate - bundleCents),
    addon_entitlement_types: types,
    book_lang: bookLang,
  };
}
