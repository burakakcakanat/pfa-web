// Sunucu tarafı kur çekimi ve çok para birimli fiyat türetme motoru.
// USD çapadır: yönetici yalnız USD girer, TRY ve EUR buradan türetilir.
//
// TRY = USD × (TCMB USD/TRY satış) × kur.try_marj_carpani → yukarı yuvarla
// EUR = USD × (USD/EUR paritesi) × kur.eur_marj_carpani  → yukarı yuvarla

import { roundUpToStep, type Currency } from "@/lib/pricing";

const TCMB_TODAY = "https://www.tcmb.gov.tr/kurlar/today.xml";

export type FxSnapshot = {
  tarih: string; // YYYY-MM-DD
  usd_satis: number;
  usd_alis: number | null;
  eur_satis: number;
  eur_alis: number | null;
};

function pick(xml: string, code: string, tag: string): number | null {
  const block = new RegExp(`<Currency[^>]*CurrencyCode="${code}"[\\s\\S]*?</Currency>`, "i").exec(xml);
  if (!block) return null;
  const m = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i").exec(block[0]);
  const n = m ? Number(String(m[1]).trim()) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** TCMB günlük kur servisinden USD ve EUR satır/satış kurlarını çeker. */
export async function fetchTcmbRates(): Promise<FxSnapshot> {
  const res = await fetch(TCMB_TODAY, { headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`TCMB isteği başarısız: HTTP ${res.status}`);
  const xml = await res.text();

  const usdSatis = pick(xml, "USD", "ForexSelling");
  const eurSatis = pick(xml, "EUR", "ForexSelling");
  if (!usdSatis || !eurSatis) throw new Error("TCMB yanıtında USD/EUR satış kuru bulunamadı.");

  const dateAttr = /Tarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  const tarih = dateAttr
    ? `${dateAttr[3]}-${dateAttr[2]}-${dateAttr[1]}`
    : new Date().toISOString().slice(0, 10);

  return {
    tarih,
    usd_satis: usdSatis,
    usd_alis: pick(xml, "USD", "ForexBuying"),
    eur_satis: eurSatis,
    eur_alis: pick(xml, "EUR", "ForexBuying"),
  };
}

type AnyClient = { from: (t: string) => any };

/** Çekilen kuru fx_rates'e yazar (hafta sonu/tatilde aynı tarih tekrar yazılır). */
export async function persistFxSnapshot(sb: AnyClient, snap: FxSnapshot): Promise<void> {
  const rows = [
    { tarih: snap.tarih, para_birimi: "usd", tcmb_alis: snap.usd_alis, tcmb_satis: snap.usd_satis, kaynak: "tcmb" },
    { tarih: snap.tarih, para_birimi: "eur", tcmb_alis: snap.eur_alis, tcmb_satis: snap.eur_satis, kaynak: "tcmb" },
  ];
  const { error } = await sb.from("fx_rates").upsert(rows, { onConflict: "tarih,para_birimi" });
  if (error) throw new Error(`fx_rates yazılamadı: ${error.message}`);
}

/** En son yayınlanmış kur — hafta sonu/tatilde son yayınlanan geçerli. */
export async function latestFxSnapshot(sb: AnyClient): Promise<FxSnapshot | null> {
  const { data } = await sb
    .from("fx_rates")
    .select("tarih, para_birimi, tcmb_alis, tcmb_satis")
    .order("tarih", { ascending: false })
    .limit(10);
  const rows: Array<{ tarih: string; para_birimi: string; tcmb_alis: number | null; tcmb_satis: number | null }> =
    data ?? [];
  if (rows.length === 0) return null;
  const tarih = rows[0]!.tarih;
  const usd = rows.find((r) => r.tarih === tarih && r.para_birimi === "usd");
  const eur = rows.find((r) => r.tarih === tarih && r.para_birimi === "eur");
  if (!usd?.tcmb_satis || !eur?.tcmb_satis) return null;
  return {
    tarih,
    usd_satis: usd.tcmb_satis,
    usd_alis: usd.tcmb_alis,
    eur_satis: eur.tcmb_satis,
    eur_alis: eur.tcmb_alis,
  };
}

export type RateMap = Record<string, number>;

export async function loadSystemRates(sb: AnyClient): Promise<RateMap> {
  const { data } = await sb.from("system_rates").select("key, value_numeric");
  const out: RateMap = {};
  for (const r of data ?? []) out[r.key] = Number(r.value_numeric);
  return out;
}

/** Hedef para birimi için USD çapasına uygulanacak efektif kur. */
export function effectiveRate(target: Currency, snap: FxSnapshot, rates: RateMap): number {
  if (target === "try") return snap.usd_satis * (rates["kur.try_marj_carpani"] ?? 1.1);
  if (target === "eur") return (snap.usd_satis / snap.eur_satis) * (rates["kur.eur_marj_carpani"] ?? 1.1);
  return 1;
}

/** USD kuruşundan hedef para biriminde yuvarlanmış fiyat türetir. */
export function derivePrice(
  usdCents: number,
  target: Currency,
  snap: FxSnapshot,
  rates: RateMap,
): { cents: number; rate: number } {
  const rate = effectiveRate(target, snap, rates);
  // Yuvarlama basamağı para birimi başına ayrıdır (TRY: kuruş, EUR/USD: sent).
  // Güvenli varsayılan 100 — tek ortak 1000 basamağı EUR'u aşırı fiyatlandırıyordu.
  const step = rates[`kur.yuvarlama_basamagi_${target}`] ?? 100;
  return { cents: roundUpToStep(Math.round(usdCents * rate), step), rate };

}

function monthsSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return Number.POSITIVE_INFINITY;
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.4375);
}

export type DerivationOutcome = {
  product_id: string;
  slug: string;
  currency: Currency;
  old_cents: number | null;
  new_cents: number;
  reason: "periyot" | "kur_sapmasi" | "elle";
  applied: boolean;
  /** Fiyat düşüşü otomatik uygulanmaz — insana bırakılır. */
  suggestion_only: boolean;
};

/**
 * Tüm ürünler için TRY/EUR fiyatlarını gözden geçirir.
 * `force` true ise (admin "türet" butonu) eşiklere bakılmaz.
 */
export async function runDerivation(
  sb: AnyClient,
  opts: { force?: boolean; onlyProductId?: string; onlyCurrency?: Currency } = {},
): Promise<{ snapshot: FxSnapshot; outcomes: DerivationOutcome[] }> {
  const snap = await latestFxSnapshot(sb);
  if (!snap) throw new Error("Kur verisi yok — önce TCMB kuru çekilmeli.");
  const rates = await loadSystemRates(sb);
  const reviewMonths = rates["kur.gozden_gecirme_ay"] ?? 3;
  const deviationPct = rates["kur.sapma_esigi"] ?? 10;

  const { data: products } = await sb.from("products").select("id, slug");
  const slugById = new Map<string, string>((products ?? []).map((p: any) => [p.id, p.slug]));

  const { data: priceRows } = await sb
    .from("product_prices")
    .select(
      "product_id, currency, price_cents, active, auto_update_frozen, last_fx_rate, price_set_at, previous_price_cents, previous_valid_until",
    );
  const rows: any[] = priceRows ?? [];
  const usdBySlugId = new Map<string, number>();
  for (const r of rows) if (r.currency === "usd" && r.active) usdBySlugId.set(r.product_id, r.price_cents);

  const targets: Currency[] = opts.onlyCurrency ? [opts.onlyCurrency] : ["try", "eur"];
  const outcomes: DerivationOutcome[] = [];

  for (const [productId, usdCents] of usdBySlugId) {
    if (opts.onlyProductId && productId !== opts.onlyProductId) continue;
    if (!usdCents || usdCents <= 0) continue;

    for (const target of targets) {
      const existing = rows.find((r) => r.product_id === productId && r.currency === target);
      if (existing?.auto_update_frozen && !opts.force) continue;
      if (existing?.auto_update_frozen && opts.force) continue; // dondurulmuş ürün elle yönetilir

      const { cents: newCents, rate } = derivePrice(usdCents, target, snap, rates);
      const oldCents: number | null = existing?.price_cents ?? null;

      let reason: DerivationOutcome["reason"] = "elle";
      let due = !!opts.force || oldCents === null;
      if (!due) {
        if (monthsSince(existing?.price_set_at ?? null) >= reviewMonths) {
          due = true;
          reason = "periyot";
        }
        const base = Number(existing?.last_fx_rate ?? 0);
        if (base > 0 && rate >= base * (1 + deviationPct / 100)) {
          due = true;
          reason = "kur_sapmasi";
        }
      }
      if (!due) continue;
      if (oldCents !== null && newCents === oldCents) continue;

      // Fiyat DÜŞÜŞÜ otomatik uygulanmaz.
      const isDecrease = oldCents !== null && newCents < oldCents;
      if (isDecrease) {
        outcomes.push({
          product_id: productId,
          slug: slugById.get(productId) ?? productId,
          currency: target,
          old_cents: oldCents,
          new_cents: newCents,
          reason,
          applied: false,
          suggestion_only: true,
        });
        continue;
      }

      const nowIso = new Date().toISOString();
      const payload: Record<string, unknown> = {
        product_id: productId,
        currency: target,
        price_cents: newCents,
        active: true,
        last_fx_rate: rate,
        price_set_at: nowIso,
        updated_at: nowIso,
        auto_update_frozen: existing?.auto_update_frozen ?? false,
      };
      if (oldCents !== null) {
        // 24 saatlik geçiş koruması
        payload.previous_price_cents = oldCents;
        payload.previous_valid_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
      const { error } = await sb
        .from("product_prices")
        .upsert(payload, { onConflict: "product_id,currency" });
      if (error) throw new Error(`Fiyat yazılamadı (${target}): ${error.message}`);

      outcomes.push({
        product_id: productId,
        slug: slugById.get(productId) ?? productId,
        currency: target,
        old_cents: oldCents,
        new_cents: newCents,
        reason,
        applied: true,
        suggestion_only: false,
      });
    }
  }

  return { snapshot: snap, outcomes };
}

const REASON_TR: Record<DerivationOutcome["reason"], string> = {
  periyot: "gözden geçirme periyodu doldu",
  kur_sapmasi: "kur sapma eşiği aşıldı",
  elle: "elle tetiklendi",
};

export function derivationReportHtml(snap: FxSnapshot, outcomes: DerivationOutcome[]): string {
  const applied = outcomes.filter((o) => o.applied);
  const suggested = outcomes.filter((o) => o.suggestion_only);
  const line = (o: DerivationOutcome) =>
    `<li><strong>${o.slug}</strong> · ${o.currency.toUpperCase()} · ${
      o.old_cents === null ? "—" : (o.old_cents / 100).toFixed(2)
    } → ${(o.new_cents / 100).toFixed(2)} <em>(${REASON_TR[o.reason]})</em></li>`;
  return `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1a2a2e">
  <h2 style="font-family:Georgia,serif">Fiyat türetme raporu — ${snap.tarih}</h2>
  <p>TCMB USD/TRY satış: <strong>${snap.usd_satis}</strong> · EUR/TRY satış: <strong>${snap.eur_satis}</strong></p>
  <h3>Otomatik uygulanan (${applied.length})</h3>
  <ul>${applied.map(line).join("") || "<li>Yok</li>"}</ul>
  <h3>Bilgi — fiyat düşürülebilir (${suggested.length})</h3>
  <ul>${suggested.map(line).join("") || "<li>Yok</li>"}</ul>
  <p style="font-size:12px;color:#6b6355">Otomatik uygulanan fiyatlarda eski fiyat 24 saat daha geçerlidir.</p>
  </body></html>`;
}