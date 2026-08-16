import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout } from "@/lib/checkout.functions";
import { PAYMENTS_LIVE } from "@/lib/payments-config";
import {
  addonSlugsForBook,
  applyDiscount,
  fmtMoney,
  matchBundleForSelection,
  priceFor,
  type BundleShape,
  type Currency,
  type CurrencyPriceMap,
} from "@/lib/pricing";

const COPY = {
  tr: {
    title: "Sipariş özeti",
    main: "Ana ürün",
    together: "Birlikte alın",
    code: "İndirim / davet kodu",
    apply: "Uygula",
    codeApplied: "Kod siparişe eklendi; geçerliyse indirimi ödeme adımında görürsünüz.",
    subtotal: "Ara toplam",
    bundleDiscount: "Paket indirimi",
    total: "Toplam",
    pay: "Ödemeye Geç",
    close: "Kapat",
    soon: "Çok Yakında",
    signed: "İsme imzalı nüsha",
    formats: "PDF ve EPUB formatlarının ikisi birden",
    listPrice: "liste fiyatı",
  },
  en: {
    title: "Order summary",
    main: "Main item",
    together: "Add to your order",
    code: "Discount or invitation code",
    apply: "Apply",
    codeApplied: "Code attached to your order; any discount appears at the payment step.",
    subtotal: "Subtotal",
    bundleDiscount: "Bundle discount",
    total: "Total",
    pay: "Continue to payment",
    close: "Close",
    soon: "Coming soon",
    signed: "Personalised signed copy",
    formats: "Both PDF and EPUB included",
    listPrice: "list price",
  },
} as const;

export type CheckoutAddonLabels = Record<string, string>;

type Props = {
  open: boolean;
  onClose: () => void;
  locale?: "tr" | "en";
  productSlug: string;
  productTitle: string;
  bookKey: string;
  currency: Currency;
  prices: CurrencyPriceMap;
  bundles: BundleShape[];
  addonLabels: CheckoutAddonLabels;
  /** Paket kartından açılırken ön seçili ek ürünler. */
  initialAddons?: string[];
};

export function CheckoutPanel({
  open,
  onClose,
  locale = "tr",
  productSlug,
  productTitle,
  bookKey,
  currency,
  prices,
  bundles,
  addonLabels,
  initialAddons,
}: Props) {
  const C = COPY[locale];
  const go = useServerFn(startCheckout);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(initialAddons ?? []);
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addons = useMemo(
    () => addonSlugsForBook(bundles, bookKey).filter((s) => !!priceFor(prices, s, currency)),
    [bundles, bookKey, prices, currency],
  );

  const mainPrice = priceFor(prices, productSlug, currency);
  const effCurrency = mainPrice?.currency ?? currency;

  const subtotal =
    (mainPrice?.cents ?? 0) +
    selected.reduce((sum, s) => sum + (priceFor(prices, s, effCurrency)?.cents ?? 0), 0);

  const match = matchBundleForSelection(bundles, bookKey, selected);
  const discount = match ? applyDiscount(subtotal, match.discount_percent) : 0;
  const total = Math.max(0, subtotal - discount);

  if (!open) return null;

  async function pay() {
    setErr(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: window.location.pathname } });
        return;
      }
      const res = await go({
        data: {
          product_slug: productSlug,
          addon_slugs: selected,
          currency: effCurrency,
          origin: window.location.origin,
          discount_code: appliedCode,
        },
      });
      if (res?.url) window.location.href = res.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.title}</div>
            <h3 className="mt-2 font-serif text-2xl leading-tight">{productTitle}</h3>
          </div>
          <button
            type="button"
            aria-label={C.close}
            onClick={onClose}
            className="text-lg text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        {/* Ana ürün — çıkarılamaz */}
        <div className="mt-5 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-accent">{C.main}</div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-serif text-base">{productTitle}</div>
              <div className="text-xs text-muted-foreground">
                {C.signed} · {C.formats}
              </div>
            </div>
            <div className="font-serif text-base text-primary">
              {fmtMoney(mainPrice?.cents ?? 0, effCurrency)}
            </div>
          </div>
        </div>

        {/* Birlikte alın */}
        {addons.length > 0 && (
          <div className="mt-5">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
              {C.together}
            </div>
            <div className="mt-2 space-y-2">
              {addons.map((slug) => {
                const p = priceFor(prices, slug, effCurrency);
                const checked = selected.includes(slug);
                return (
                  <label
                    key={slug}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, slug] : prev.filter((s) => s !== slug),
                          )
                        }
                      />
                      <span>{addonLabels[slug] ?? slug}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {fmtMoney(p?.cents ?? 0, effCurrency)}{" "}
                      <span className="text-[0.65rem]">{C.listPrice}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* İndirim / davet kodu */}
        <div className="mt-5">
          <label className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            {C.code}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={64}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setAppliedCode(code.trim() || null)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              {C.apply}
            </button>
          </div>
          {appliedCode && <p className="mt-2 text-xs text-muted-foreground">{C.codeApplied}</p>}
        </div>

        {/* Toplam */}
        <div className="mt-6 space-y-1 border-t border-border pt-4 text-sm">
          <Row label={C.subtotal} value={fmtMoney(subtotal, effCurrency)} />
          <Row
            label={C.bundleDiscount}
            value={`− ${fmtMoney(discount, effCurrency)}`}
            muted={discount === 0}
          />
          <div className="flex items-baseline justify-between pt-2 font-serif text-lg">
            <span>{C.total}</span>
            <span className="text-primary">{fmtMoney(total, effCurrency)}</span>
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {C.close}
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={busy || !PAYMENTS_LIVE}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {PAYMENTS_LIVE ? (busy ? "…" : C.pay) : C.soon}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
