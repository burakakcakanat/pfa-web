import { useCallback, useEffect, useState } from "react";
import {
  guessBrowserCurrency,
  readStoredCurrency,
  SELECTABLE_CURRENCIES,
  storeCurrency,
  type Currency,
} from "@/lib/pricing";

const EVENT = "pfa:currency-change";

/**
 * Para birimi seçimi. TR yüzeylerde seçici yoktur ve her zaman TRY uygulanır;
 * İngilizce yüzeylerde kullanıcı USD/EUR arasında seçim yapar (localStorage).
 */
export function useCurrency(locale: "tr" | "en"): [Currency, (c: Currency) => void] {
  const [currency, setCurrency] = useState<Currency>(locale === "tr" ? "try" : "usd");

  useEffect(() => {
    if (locale === "tr") {
      setCurrency("try");
      return;
    }
    const apply = () => {
      const stored = readStoredCurrency();
      setCurrency(stored === "eur" ? "eur" : stored === "usd" ? "usd" : guessBrowserCurrency() === "try" ? "usd" : "usd");
    };
    apply();
    window.addEventListener(EVENT, apply);
    return () => window.removeEventListener(EVENT, apply);
  }, [locale]);

  const change = useCallback((c: Currency) => {
    storeCurrency(c);
    setCurrency(c);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [currency, change];
}

export function CurrencySelector({ className }: { className?: string }) {
  const [currency, change] = useCurrency("en");
  return (
    <div className={`inline-flex items-center gap-1 rounded-md border border-border p-0.5 ${className ?? ""}`}>
      {SELECTABLE_CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => change(c)}
          aria-pressed={currency === c}
          className={`rounded px-2.5 py-1 text-xs uppercase tracking-wide transition-colors ${
            currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}