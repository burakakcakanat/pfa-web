import { useEffect, useState } from "react";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";

/**
 * Site-wide payment channel switch (site_settings.payment_mode).
 * Flipping this in the admin panel is enough — no redeploy needed.
 */
export type PaymentMode = "bank_transfer" | "card" | "both";

export const PAYMENT_MODE_DEFAULT: PaymentMode = "bank_transfer";

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  bank_transfer: "Yalnızca havale/EFT",
  card: "Yalnızca kart ile ödeme",
  both: "Havale + kart (kullanıcı seçer)",
};

export function normalizePaymentMode(v: string | null | undefined): PaymentMode {
  return v === "card" || v === "both" || v === "bank_transfer" ? v : PAYMENT_MODE_DEFAULT;
}

/** Client-side reader. Returns the default until the setting has loaded. */
export function usePaymentMode(): PaymentMode {
  const [mode, setMode] = useState<PaymentMode>(PAYMENT_MODE_DEFAULT);
  useEffect(() => {
    let alive = true;
    getPublicSiteSettings()
      .then((s) => {
        if (alive) setMode(normalizePaymentMode((s as Record<string, string>)?.payment_mode));
      })
      .catch(() => {
        /* keep the safe default */
      });
    return () => {
      alive = false;
    };
  }, []);
  return mode;
}
