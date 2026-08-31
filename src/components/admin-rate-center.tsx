import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { InfoHint } from "@/components/info-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  deriveNow,
  getRateCenter,
  setBundleDiscount,
  setCorporateTier,
  setManualDerivedPrice,
  setPriceFreeze,
  setSystemRate,
  setUsdPrice,
  syncFxNow,
} from "@/lib/rates.functions";
import { applyDiscount, fmtMoney, type Currency, type CurrencyPriceMap } from "@/lib/pricing";
import { bookSlugFor, bundleComponents, resolveBundlePriceInCurrency } from "@/lib/bundles";

type RateRow = {
  key: string;
  kategori: string;
  label_tr: string;
  value_type: string;
  value_numeric: number | string;
  currency: string | null;
  aciklama: string | null;
  min_value: number | string | null;
  max_value: number | string | null;
  kaynak_karar: string | null;
  updated_at: string | null;
  updated_by: string | null;
};
type PriceRow = {
  product_id: string;
  currency: string;
  price_cents: number;
  active: boolean;
  auto_update_frozen: boolean;
  last_fx_rate: number | string | null;
  price_set_at: string | null;
  previous_price_cents: number | null;
  previous_valid_until: string | null;
  updated_at: string | null;
};
type Payload = Awaited<ReturnType<typeof getRateCenter>>;

const UNIT_LABEL: Record<string, string> = {
  percent: "%",
  money: "para",
  integer: "adet",
  day_of_month: "ayın günü",
  months: "ay",
  hours: "saat",
  numeric: "çarpan",
};

const CATEGORY_TITLES: Array<{ keys: string[]; title: string; note?: string; hint?: string }> = [
  { keys: ["lisans"], title: "Lisans & Abonelik" },
  {
    keys: ["komisyon"],
    title: "Komisyon Oranları",
    hint: "Referanslı ölçek satışında uygulanır: Practitioner %25, Fellow %50. Danışandan tahsilat sonrası deftere işler.",
  },
  { keys: ["indirim"], title: "Etkinlik & Teşvik" },
  { keys: ["kur"], title: "Kur & Türetme" },
  { keys: ["takvim", "esik"], title: "Takvim & Eşikler" },
];

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminRateCenter() {
  const load = useServerFn(getRateCenter);
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await load());
    } catch (e: any) {
      toast.error(e?.message ?? "Fiyat & Oran Merkezi yüklenemedi");
    }
  }, [load]);
  useEffect(() => {
    reload();
  }, [reload]);

  if (!data) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  return (
    <div className="space-y-10">
      <header className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-2xl">Fiyat &amp; Oran Merkezi</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tek yazma yüzeyi. USD çapadır — yalnızca USD girilir, TRY ve EUR otomatik türetilir.
          Otomatik fiyat artışında eski fiyat 24 saat daha geçerli kalır; fiyat düşüşleri otomatik
          uygulanmaz.
        </p>
      </header>

      <ProductPrices data={data} reload={reload} busy={busy} setBusy={setBusy} />
      <BundleDiscounts data={data} reload={reload} />
      <CorporateTiers data={data} reload={reload} />
      {CATEGORY_TITLES.map((g) => (
        <RateGroup key={g.title} title={g.title} hint={g.hint} kategoriler={g.keys} rows={data.rates as RateRow[]} actors={data.actors} reload={reload}>
          {g.title === "Kur & Türetme" ? <FxPanel data={data} reload={reload} /> : null}
        </RateGroup>
      ))}
      <ChangeLog data={data} />
    </div>
  );
}

function Section({ title, desc, hint, children }: { title: string; desc?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h3 className="flex items-center gap-2 font-serif text-lg">
          {title}
          {hint ? <InfoHint text={hint} /> : null}
        </h3>
        {desc ? <p className="text-xs text-muted-foreground">{desc}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ---------------- 1. Ürün Fiyatları ---------------- */

function ProductPrices({
  data,
  reload,
  busy,
  setBusy,
}: {
  data: Payload;
  reload: () => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const saveUsd = useServerFn(setUsdPrice);
  const freeze = useServerFn(setPriceFreeze);
  const manual = useServerFn(setManualDerivedPrice);
  const derive = useServerFn(deriveNow);

  const priceOf = (pid: string, cur: string): PriceRow | undefined =>
    (data.prices as PriceRow[]).find((p) => p.product_id === pid && p.currency === cur);

  async function onSaveUsd(pid: string, label: string, value: string) {
    const cents = Math.round(Number(value.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) return toast.error("Geçersiz tutar");
    const current = priceOf(pid, "usd")?.price_cents ?? 0;
    if (current > 0) {
      const change = Math.abs(cents - current) / current;
      if (change > 0.2) {
        const ok = window.confirm(
          `Emin misiniz?\n${label}\nEski: ${fmtMoney(current, "usd")} → Yeni: ${fmtMoney(cents, "usd")}`,
        );
        if (!ok) return;
      }
    }
    setBusy(true);
    try {
      await saveUsd({ data: { product_id: pid, price_cents: cents } });
      await derive({ data: { product_id: pid } });
      toast.success("USD fiyatı kaydedildi, TRY/EUR türetildi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Ürün Fiyatları"
      desc="USD düzenlenebilir. TRY ve EUR türetilmiştir (salt okunur) — dondurulmuş satırlar elle girilir."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await derive({ data: {} });
              toast.success(`Türetildi — ${r.outcomes.filter((o) => o.applied).length} fiyat güncellendi`);
              reload();
            } catch (e: any) {
              toast.error(e?.message ?? "Türetilemedi");
            } finally {
              setBusy(false);
            }
          }}
        >
          Tüm fiyatları türet
        </Button>
        <InfoHint text="USD çapa fiyattan TRY/EUR türetir. Artışlar 24 saat geçişle uygulanır; düşüşler asla otomatik uygulanmaz, öneri olarak listelenir." />
      </div>

      <div className="space-y-2">
        {(data.products as any[]).map((p) => {
          const usd = priceOf(p.id, "usd");
          return (
            <div key={p.id} className="rounded-md border border-border/70 px-3 py-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-[220px] flex-1 text-sm">
                  {p.name_tr}
                  <span className="ml-2 text-[11px] text-muted-foreground">{p.slug}</span>
                  {!p.active ? <Badge variant="outline" className="ml-2 text-[10px]">pasif</Badge> : null}
                </span>
                <UsdInput
                  initial={usd ? (usd.price_cents / 100).toFixed(2) : ""}
                  disabled={busy}
                  onSave={(v) => onSaveUsd(p.id, p.name_tr, v)}
                />
                {(["try", "eur"] as Currency[]).map((cur) => {
                  const row = priceOf(p.id, cur);
                  return (
                    <div key={cur} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">{cur}</Badge>
                      {row?.auto_update_frozen ? (
                        <ManualInput
                          initial={row ? (row.price_cents / 100).toFixed(2) : ""}
                          onSave={async (v) => {
                            const cents = Math.round(Number(v.replace(",", ".")) * 100);
                            if (!Number.isFinite(cents) || cents < 0) return toast.error("Geçersiz tutar");
                            try {
                              await manual({ data: { product_id: p.id, currency: cur as "try" | "eur", price_cents: cents } });
                              toast.success("Elle fiyat kaydedildi");
                              reload();
                            } catch (e: any) {
                              toast.error(e?.message ?? "Kaydedilemedi");
                            }
                          }}
                        />
                      ) : (
                        <span className="w-28 text-right text-sm tabular-nums">
                          {row ? fmtMoney(row.price_cents, cur) : "—"}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        disabled={busy || row?.auto_update_frozen}
                        onClick={async () => {
                          try {
                            await derive({ data: { product_id: p.id, currency: cur as "try" | "eur" } });
                            toast.success("Türetildi");
                            reload();
                          } catch (e: any) {
                            toast.error(e?.message ?? "Türetilemedi");
                          }
                        }}
                      >
                        türet
                      </Button>
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        dondur
                        <Switch
                          checked={!!row?.auto_update_frozen}
                          onCheckedChange={async (checked) => {
                            try {
                              await freeze({
                                data: { product_id: p.id, currency: cur as "try" | "eur", frozen: checked },
                              });
                              reload();
                            } catch (e: any) {
                              toast.error(e?.message ?? "Değiştirilemedi");
                            }
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Son değişiklik: {fmtDate(usd?.updated_at ?? usd?.price_set_at)}
                {(["try", "eur"] as const).map((cur) => {
                  const row = priceOf(p.id, cur);
                  if (!row?.previous_price_cents || !row.previous_valid_until) return null;
                  if (new Date(row.previous_valid_until).getTime() <= Date.now()) return null;
                  return (
                    <span key={cur} className="ml-3 text-primary">
                      {cur.toUpperCase()} geçiş penceresi açık — eski fiyat {fmtMoney(row.previous_price_cents, cur)}{" "}
                      ({fmtDate(row.previous_valid_until)}'e kadar)
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function UsdInput({
  initial,
  onSave,
  disabled,
}: {
  initial: string;
  onSave: (v: string) => void;
  disabled?: boolean;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  return (
    <div className="flex items-center gap-2">
      <Badge className="text-[10px] uppercase">usd</Badge>
      <Input
        className="h-8 w-28 text-right tabular-nums"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="0.00"
        inputMode="decimal"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={disabled || v === initial}
        onClick={() => onSave(v)}
      >
        Kaydet
      </Button>
    </div>
  );
}

function ManualInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-8 w-28 text-right tabular-nums"
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="decimal"
      />
      <Button size="sm" variant="outline" className="h-8" disabled={v === initial} onClick={() => onSave(v)}>
        Kaydet
      </Button>
    </div>
  );
}

/* ---------------- 2. Paket Yönetimi ---------------- */

function BundleDiscounts({ data, reload }: { data: Payload; reload: () => void }) {
  const save = useServerFn(setBundleDiscount);

  // Çok para birimli fiyat haritası — kanonik fonksiyonun beklediği biçim.
  const priceMap = useMemo(() => {
    const slugById = new Map<string, string>((data.products as any[]).map((p) => [p.id, p.slug]));
    const m: CurrencyPriceMap = {};
    for (const r of data.prices as PriceRow[]) {
      if (!r.active || !r.price_cents) continue;
      const slug = slugById.get(r.product_id);
      if (!slug) continue;
      (m[slug] ??= {})[r.currency as Currency] = r.price_cents;
    }
    return m;
  }, [data]);

  const bookLangFor = (bookKey: string): "tr" | "en" => (bookKey === "hcd" ? "en" : "tr");

  return (
    <Section
      title="Paket Yönetimi"
      desc="Tüm paketler bileşen toplamı − indirim modelindedir. Fiyatlar kanonik fonksiyonla türetilir (.90 bitişli); site, admin ve ödeme aynı değeri gösterir."
    >
      <div className="space-y-3">
        {(data.bundles as any[]).map((b) => {
          const items = (data.bundleItems as any[])
            .filter((i) => i.bundle_id === b.id)
            .map((i) => ({ product_slug: i.product_slug, quantity: i.quantity ?? 1 }));
          const lang = bookLangFor(b.book_key);
          const shape = {
            discount_percent: b.discount_percent ?? 0,
            includes_book: !!b.includes_book,
            book_key: b.book_key,
            items,
          };
          const comps = bundleComponents(shape, lang);
          const usd = resolveBundlePriceInCurrency(shape, priceMap, "usd", lang);
          const try_ = resolveBundlePriceInCurrency(shape, priceMap, "try", lang);
          return (
            <div key={b.id} className="rounded-md border border-border/70 px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-[220px] flex-1 text-sm">
                  {b.name_tr}
                  <span className="ml-2 text-[11px] text-muted-foreground">{b.slug}</span>
                  {!b.active && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      pasif
                    </Badge>
                  )}
                </span>
                <PercentInput
                  initial={String(b.discount_percent ?? 0)}
                  onSave={async (v) => {
                    const pct = Math.round(Number(v));
                    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error("0–100 arası bir oran girin");
                    const old = Number(b.discount_percent ?? 0);
                    if (old > 0 && Math.abs(pct - old) / old > 0.2) {
                      if (!window.confirm(`Emin misiniz?\n${b.name_tr}\nEski: %${old} → Yeni: %${pct}`)) return;
                    }
                    try {
                      await save({ data: { id: b.id, discount_percent: pct } });
                      toast.success("İndirim kaydedildi");
                      reload();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Kaydedilemedi");
                    }
                  }}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  USD:{" "}
                  <strong className="text-foreground">{usd ? fmtMoney(usd.cents, usd.currency) : "—"}</strong>
                  {" · "}TRY:{" "}
                  <strong className="text-foreground">
                    {try_ && try_.currency === "try" ? fmtMoney(try_.cents, "try") : "—"}
                  </strong>
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {comps.map((c) => {
                  const isBook = b.includes_book && c.slug === bookSlugFor(b.book_key, lang);
                  return (
                    <li key={c.slug} className="flex flex-wrap gap-2">
                      <span className="min-w-[220px]">
                        {c.slug}
                        {c.quantity > 1 ? ` × ${c.quantity}` : ""}
                        {isBook ? " (kitap)" : ""}
                      </span>
                      <span className="tabular-nums">
                        USD {priceMap[c.slug]?.usd ? fmtMoney(priceMap[c.slug]!.usd!, "usd") : "—"} · TRY{" "}
                        {priceMap[c.slug]?.try ? fmtMoney(priceMap[c.slug]!.try!, "try") : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function PercentInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  return (
    <div className="flex items-center gap-1">
      <Badge variant="secondary" className="text-[10px]">%</Badge>
      <Input
        className="h-8 w-20 text-right tabular-nums"
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="numeric"
      />
      <Button size="sm" variant="outline" className="h-8" disabled={v === initial} onClick={() => onSave(v)}>
        Kaydet
      </Button>
    </div>
  );
}

/* ---------------- 3. Kurumsal Kademeler ---------------- */

function CorporateTiers({ data, reload }: { data: Payload; reload: () => void }) {
  const save = useServerFn(setCorporateTier);
  return (
    <Section title="Kurumsal Kademeler" desc="Lisans adedine göre kurumsal paket indirim oranları.">
      <div className="space-y-2">
        {(data.tiers as any[]).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border/70 px-3 py-2">
            <span className="min-w-[120px] text-sm">{t.tier} lisans</span>
            <PercentInput
              initial={String(Number(t.indirim_orani))}
              onSave={async (v) => {
                const pct = Number(v);
                if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error("0–100 arası bir oran girin");
                const old = Number(t.indirim_orani);
                if (old > 0 && Math.abs(pct - old) / old > 0.2) {
                  if (!window.confirm(`Emin misiniz?\n${t.tier} lisans\nEski: %${old} → Yeni: %${pct}`)) return;
                }
                try {
                  await save({ data: { id: t.id, indirim_orani: pct, aktif: t.aktif } });
                  toast.success("Kademe kaydedildi");
                  reload();
                } catch (e: any) {
                  toast.error(e?.message ?? "Kaydedilemedi");
                }
              }}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              aktif
              <Switch
                checked={!!t.aktif}
                onCheckedChange={async (checked) => {
                  try {
                    await save({ data: { id: t.id, indirim_orani: Number(t.indirim_orani), aktif: checked } });
                    reload();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Değiştirilemedi");
                  }
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- 4–8. system_rates grupları ---------------- */

function RateGroup({
  title,
  hint,
  kategoriler,
  rows,
  actors,
  reload,
  children,
}: {
  title: string;
  hint?: string;
  kategoriler: string[];
  rows: RateRow[];
  actors: Record<string, string>;
  reload: () => void;
  children?: React.ReactNode;
}) {
  const save = useServerFn(setSystemRate);
  const list = rows.filter((r) => kategoriler.includes(r.kategori));
  return (
    <Section title={title} hint={hint}>
      {children}
      <div className="mt-4 space-y-2">
        {list.map((r) => (
          <div key={r.key} className="rounded-md border border-border/70 px-3 py-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-[240px] flex-1 text-sm">
                {r.label_tr}
                <span className="ml-2 text-[11px] text-muted-foreground">{r.key}</span>
                {r.kaynak_karar ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">{r.kaynak_karar}</Badge>
                ) : null}
                {r.key.includes("yuvarlama_basamagi") ? (
                  <span className="ml-2 inline-flex align-middle">
                    <InfoHint text="TRY 1000 kuruş = 10 TL'ye, EUR/USD 100 sent = 1 birime yukarı yuvarlar." />
                  </span>
                ) : null}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {r.currency ? r.currency.toUpperCase() : (UNIT_LABEL[r.value_type] ?? r.value_type)}
              </Badge>
              <ValueInput
                initial={String(Number(r.value_numeric))}
                onSave={async (v) => {
                  const num = Number(v.replace(",", "."));
                  if (!Number.isFinite(num)) return toast.error("Geçersiz değer");
                  const min = r.min_value === null ? null : Number(r.min_value);
                  const max = r.max_value === null ? null : Number(r.max_value);
                  if (min !== null && num < min) return toast.error(`${r.label_tr} en az ${min} olabilir.`);
                  if (max !== null && num > max) return toast.error(`${r.label_tr} en fazla ${max} olabilir.`);
                  const old = Number(r.value_numeric);
                  if (old !== 0 && Math.abs(num - old) / Math.abs(old) > 0.2) {
                    if (!window.confirm(`Emin misiniz?\n${r.label_tr}\nEski: ${old} → Yeni: ${num}`)) return;
                  }
                  try {
                    await save({ data: { key: r.key, value: num } });
                    toast.success("Kaydedildi");
                    reload();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Kaydedilemedi");
                  }
                }}
              />
            </div>
            {r.aciklama ? <p className="mt-1 text-[11px] text-muted-foreground">{r.aciklama}</p> : null}
            <p className="text-[11px] text-muted-foreground">
              Son değişiklik: {fmtDate(r.updated_at)}
              {r.updated_by ? ` · ${actors[r.updated_by] ?? "—"}` : ""}
              {r.min_value !== null || r.max_value !== null
                ? ` · sınır: ${r.min_value ?? "−∞"} … ${r.max_value ?? "∞"}`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ValueInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-8 w-28 text-right tabular-nums"
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="decimal"
      />
      <Button size="sm" variant="outline" className="h-8" disabled={v === initial} onClick={() => onSave(v)}>
        Kaydet
      </Button>
    </div>
  );
}

/* ---------------- Kur paneli ---------------- */

function FxPanel({ data, reload }: { data: Payload; reload: () => void }) {
  const sync = useServerFn(syncFxNow);
  const fx = data.fx as Array<{ tarih: string; para_birimi: string; tcmb_alis: number | null; tcmb_satis: number | null }>;
  const latestDate = fx[0]?.tarih ?? null;
  const latest = fx.filter((r) => r.tarih === latestDate);
  return (
    <div className="rounded-md border border-border/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <strong>Son çekilen kur:</strong> {latestDate ?? "henüz kur çekilmedi"}
          {latest.map((r) => (
            <span key={r.para_birimi} className="ml-3 text-xs text-muted-foreground">
              {r.para_birimi.toUpperCase()}/TRY satış: {r.tcmb_satis}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              const s = await sync();
              toast.success(`TCMB kuru çekildi (${s.tarih})`);
              reload();
            } catch (e: any) {
              toast.error(e?.message ?? "Kur çekilemedi");
            }
          }}
        >
          Kuru şimdi çek
        </Button>
        <InfoHint text="TCMB satış kurunu çeker; fiyatları DEĞİŞTİRMEZ. Fiyat değişimi için ayrıca Türet gerekir." />
      </div>
      {fx.length > 0 ? (
        <div className="mt-3 max-h-40 overflow-auto text-[11px]">
          {fx.map((r) => (
            <div key={`${r.tarih}-${r.para_birimi}`} className="flex gap-4 border-b border-border/40 py-1">
              <span className="w-24 tabular-nums">{r.tarih}</span>
              <span className="w-12 uppercase">{r.para_birimi}</span>
              <span className="tabular-nums">alış {r.tcmb_alis ?? "—"}</span>
              <span className="tabular-nums">satış {r.tcmb_satis ?? "—"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- 9. Değişiklik Geçmişi ---------------- */

function ChangeLog({ data }: { data: Payload }) {
  const log = data.log as Array<{
    id: string;
    key: string;
    eski_deger: number | string | null;
    yeni_deger: number | string | null;
    degistiren: string | null;
    degisim_at: string;
    not_metni: string | null;
  }>;
  return (
    <Section title="Değişiklik Geçmişi" desc="Son 200 kayıt. Otomatik türetmeler 'otomatik türetme' notuyla görünür.">
      {log.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
      ) : (
        <div className="max-h-96 overflow-auto text-xs">
          {log.map((r) => (
            <div key={r.id} className="flex flex-wrap gap-3 border-b border-border/40 py-1.5">
              <span className="w-40 shrink-0 text-muted-foreground">{fmtDate(r.degisim_at)}</span>
              <span className="min-w-[200px] flex-1">{r.key}</span>
              <span className="tabular-nums">
                {r.eski_deger ?? "—"} → <strong>{r.yeni_deger ?? "—"}</strong>
              </span>
              <span className="text-muted-foreground">
                {r.degistiren ? (data.actors as Record<string, string>)[r.degistiren] ?? "—" : (r.not_metni ?? "otomatik")}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}