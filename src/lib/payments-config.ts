/**
 * Kart ödeme rayı canlı mı? Sağlayıcı (Lemon Squeezy veya PayTR) seçilip
 * adaptör doldurulana kadar `false` kalır.
 *
 * Bilinçli olarak KOD düzeyinde tanımlıdır — admin panelinden veya
 * site_settings üzerinden yanlışlıkla açılamaz.
 */
export const PAYMENTS_LIVE = false;

export type PaymentProvider = "lemonsqueezy" | "paytr" | "manual" | "test";

/** Havale (purchase_inquiries) akışı YALNIZCA bu ürün için geçerlidir. */
export const BANK_TRANSFER_ONLY_SLUG = "pfa-pro-lisans-paketi";
