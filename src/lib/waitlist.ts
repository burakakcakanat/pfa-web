// Bekleme listesi (imzalı kitap) — istemci/sunucu ortak, saf yardımcılar.

export const WAITLIST_BOOKS = [
  { slug: "pfa-ebook-tr", label: "Psİko-Fonksİyonel Analİz (Türkçe)" },
  { slug: "pfa-ebook-en", label: "Psycho-Functional Analysis (İngilizce)" },
  { slug: "hcd-ebook-en", label: "HCD (İngilizce)" },
] as const;

export type WaitlistBookSlug = (typeof WAITLIST_BOOKS)[number]["slug"];

export const WAITLIST_DEFAULT_PCT = 10;
export const WAITLIST_RATE_KEY = "indirim.bekleme_listesi_kitap";

export function isWaitlistBook(slug: string): slug is WaitlistBookSlug {
  return WAITLIST_BOOKS.some((b) => b.slug === slug);
}

export function waitlistBookLabel(slug: string): string {
  return WAITLIST_BOOKS.find((b) => b.slug === slug)?.label ?? slug;
}

/**
 * Bekleme listesi indirimi: yalnız kitap satırına, ödeme günündeki güncel
 * fiyat üzerinden uygulanır. Aktif (iptal edilmemiş) kayıt yoksa 0.
 */
export function waitlistDiscountCents(
  bookPriceCents: number,
  opts: { productSlug: string; hasActiveWaitlist: boolean; pct: number; hasAddons: boolean },
): number {
  if (!opts.hasActiveWaitlist || opts.hasAddons || !isWaitlistBook(opts.productSlug)) return 0;
  const pct = Math.max(0, Math.min(100, opts.pct || 0));
  return Math.round(bookPriceCents * (pct / 100));
}

export type WaitlistStatus = "waiting" | "notified" | "converted" | "cancelled";

export const WAITLIST_STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: "Talep alındı",
  notified: "Ödeme açıldı",
  converted: "Ödendi",
  cancelled: "İptal",
};
