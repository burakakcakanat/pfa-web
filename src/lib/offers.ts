// Client-safe definitions for the optional add-on ("cashier offer") shown inside
// the enquiry form. There is NO parallel discount system here: every offer is an
// existing row in public.bundles, and the price comes from resolveBundlePrice().
//
// One offer per page, maximum. Never shown on the free mini-assessment result.

/** product slug currently being requested → bundle slug that adds one thing to it */
export const ADDON_BUNDLE_FOR_PRODUCT: Record<string, string> = {
  "danismanlik-oturumu": "pfa-seans-kitap",
  "tam-assessment-rapor": "pfa-olcek-kitap",
  "pfa-ebook-tr": "pfa-olcek-kitap",
  "pfa-ebook-en": "pfa-olcek-kitap",
  "bilinc-seviyeleri-calismalari": "pfa-webinar-kitap",
};

export type EntitlementTypeName =
  | "ebook"
  | "assessment_full"
  | "webinar_bsc"
  | "pfa_pro"
  | "session";

/** Which entitlement a catalogue product grants. Adding 7Q later = one line here. */
export function entitlementTypeForSlug(slug: string): EntitlementTypeName | null {
  if (slug === "danismanlik-oturumu") return "session";
  if (slug === "tam-assessment-rapor") return "assessment_full";
  if (slug === "bilinc-seviyeleri-calismalari") return "webinar_bsc";
  if (slug === "pfa-pro-lisans-paketi") return "pfa_pro";
  if (slug.endsWith("-ebook-tr") || slug.endsWith("-ebook-en")) return "ebook";
  return null;
}

export type AddonOffer = {
  bundle_slug: string;
  bundle_label: string;
  addon_label: string;
  bundle_price_cents: number;
  separate_price_cents: number;
  saving_cents: number;
  /** Hide the offer when the signed-in user already holds one of these. */
  addon_entitlement_types: EntitlementTypeName[];
  book_lang: "tr" | "en";
};
