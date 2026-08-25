import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BuyButton } from "@/components/buy-button";
import { listPractitionerWebinars, registerFreeProgramWebinar } from "@/lib/practitioner-webinars.functions";

type Data = Awaited<ReturnType<typeof listPractitionerWebinars>>;

function formatPrice(cents: number, currency: string) {
  const cur = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(cur === "TRY" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${cur}`;
  }
}

export function PractitionerWebinarsTab() {
  const fetchList = useServerFn(listPractitionerWebinars);
  const registerFree = useServerFn(registerFreeProgramWebinar);
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchList()
      .then(setData)
      .catch(() => setData({ isPro: false, tier: "practitioner", items: [] } as Data));
  }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);

  const join = async (slug: string) => {
    setBusy(slug);
    try {
      await registerFree({ data: { product_slug: slug } });
      toast.success("Kaydınız alındı. Katılım bağlantısı e-posta ile paylaşılacak.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Kayıt oluşturulamadı");
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  if (!data.isPro) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Bu bölüm yalnızca PFA uygulayıcılarına açıktır.
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Şu anda planlanmış bir uygulayıcı webinarı yok. Yeni oturumlar burada duyurulacak.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Rozetiniz: <span className="font-medium text-foreground">{data.tier === "fellow" ? "Fellow" : "PFAP"}</span>{" "}
        — gelişim programına dahil oturumlar Fellow rozetinde ücretsizdir.
      </div>
      {data.items.map((w) => {
        const price = w.prices.try ?? w.prices.usd ?? w.prices.eur ?? w.fallback_price_cents;
        const cur = w.prices.try ? "try" : w.prices.usd ? "usd" : w.prices.eur ? "eur" : w.fallback_currency;
        return (
          <div key={w.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg">{w.session?.title ?? w.name}</h3>
              {w.included_in_program && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Gelişim programına dahil</span>
              )}
            </div>
            {w.session?.starts_at && (
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(w.session.starts_at).toLocaleString("tr-TR")}
              </div>
            )}
            {w.description && <p className="mt-2 text-sm text-muted-foreground">{w.description}</p>}
            <div className="mt-4">
              {w.registered ? (
                <span className="text-sm text-accent">Kaydınız var ✓</span>
              ) : w.free_for_me ? (
                <button
                  type="button"
                  disabled={busy === w.slug}
                  onClick={() => join(w.slug)}
                  className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-60"
                >
                  {busy === w.slug ? "Kaydediliyor…" : "Ücretsiz Katıl"}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {price != null && <span className="text-sm text-muted-foreground">{formatPrice(price, cur)}</span>}
                  <BuyButton productSlug={w.slug} label="Satın Al" onSuccess={reload} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
