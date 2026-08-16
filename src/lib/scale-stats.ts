// Pure statistics helpers for the admin "Ölçek Verileri" screen.
// Likert 1–5; reverse-coded items are translated with 6 - value.

export type ItemRow = {
  key: string; // research_id or session_id
  question_id: string;
  item_code: string | null;
  level: number;
  text: string;
  reverse_coded: boolean;
  value: number;
};

export type ItemStat = {
  question_id: string;
  item_code: string | null;
  level: number;
  text: string;
  reverse_coded: boolean;
  n: number;
  mean: number;
  sd: number;
  dist: [number, number, number, number, number];
  itemTotal: number | null;
  lowDiscrimination: boolean;
};

export type LevelStat = { level: number; n: number; items: number; alpha: number | null };

export const coded = (value: number, reverse: boolean) => (reverse ? 6 - value : value);

function mean(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1);
}

function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]! - ma;
    const y = b[i]! - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

/** Item statistics plus per-level Cronbach alpha, computed on coded values. */
export function computeItemStats(rows: ItemRow[]): { items: ItemStat[]; levels: LevelStat[] } {
  // key -> question_id -> coded value
  const byKey = new Map<string, Map<string, number>>();
  const meta = new Map<string, ItemRow>();
  for (const r of rows) {
    if (!Number.isFinite(r.value)) continue;
    if (!meta.has(r.question_id)) meta.set(r.question_id, r);
    let m = byKey.get(r.key);
    if (!m) {
      m = new Map();
      byKey.set(r.key, m);
    }
    m.set(r.question_id, coded(r.value, r.reverse_coded));
  }

  const questionIds = Array.from(meta.keys());
  const levels = Array.from(new Set(questionIds.map((q) => meta.get(q)!.level))).sort((a, b) => a - b);

  const items: ItemStat[] = [];
  const levelStats: LevelStat[] = [];

  for (const level of levels) {
    const qs = questionIds.filter((q) => meta.get(q)!.level === level);
    // Complete cases for this level (needed for alpha and item-total correlation).
    const complete = Array.from(byKey.values()).filter((m) => qs.every((q) => m.has(q)));

    for (const q of qs) {
      const info = meta.get(q)!;
      const values: number[] = [];
      for (const m of byKey.values()) {
        const v = m.get(q);
        if (v !== undefined) values.push(v);
      }
      const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      for (const v of values) {
        const raw = info.reverse_coded ? 6 - v : v; // original response
        if (raw >= 1 && raw <= 5) dist[raw - 1] += 1;
      }
      const own = complete.map((m) => m.get(q)!);
      const rest = complete.map((m) =>
        qs.filter((o) => o !== q).reduce((s, o) => s + m.get(o)!, 0),
      );
      const itemTotal = complete.length >= 3 ? pearson(own, rest) : null;
      items.push({
        question_id: q,
        item_code: info.item_code,
        level,
        text: info.text,
        reverse_coded: info.reverse_coded,
        n: values.length,
        mean: values.length ? Number(mean(values).toFixed(2)) : 0,
        sd: values.length > 1 ? Number(Math.sqrt(variance(values)).toFixed(2)) : 0,
        dist,
        itemTotal: itemTotal === null ? null : Number(itemTotal.toFixed(2)),
        lowDiscrimination: itemTotal !== null && itemTotal < 0.3,
      });
    }

    // Cronbach alpha for this level.
    let alpha: number | null = null;
    if (complete.length >= 3 && qs.length >= 2) {
      const itemVarSum = qs.reduce((s, q) => s + variance(complete.map((m) => m.get(q)!)), 0);
      const totals = complete.map((m) => qs.reduce((s, q) => s + m.get(q)!, 0));
      const totalVar = variance(totals);
      if (totalVar > 0) {
        const k = qs.length;
        alpha = Number(((k / (k - 1)) * (1 - itemVarSum / totalVar)).toFixed(2));
      }
    }
    levelStats.push({ level, n: complete.length, items: qs.length, alpha });
  }

  items.sort((a, b) => a.level - b.level || String(a.item_code ?? "").localeCompare(String(b.item_code ?? "")));
  return { items, levels: levelStats };
}
