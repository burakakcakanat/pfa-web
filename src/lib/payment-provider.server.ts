import { PAYMENTS_LIVE, type PaymentProvider } from "@/lib/payments-config";

export type ProviderOrder = {
  order_id: string;
  amount_cents: number;
  currency: "usd" | "try" | "eur";
  description: string;
  origin: string;
  customer_email: string | null;
};

/**
 * Sağlayıcıdan bağımsız tek arayüz noktası. Lemon Squeezy veya PayTR seçilince
 * YALNIZCA burası doldurulacak; teslimat zinciri `orders.status = 'paid'`
 * alanına bağlı olduğundan başka hiçbir yerde değişiklik gerekmez.
 */
export async function createProviderCheckout(
  order: ProviderOrder,
  provider: PaymentProvider,
): Promise<{ url: string; provider_ref: string | null }> {
  if (!PAYMENTS_LIVE) {
    throw new Error("Kartlı ödeme henüz açık değil.");
  }
  switch (provider) {
    case "lemonsqueezy":
    case "paytr":
      // TODO: sağlayıcı seçildiğinde burada checkout oturumu açılacak.
      throw new Error("Ödeme sağlayıcısı henüz yapılandırılmadı.");
    default:
      throw new Error("Geçersiz ödeme sağlayıcısı.");
  }
}
