export const LEVEL_TO_INTELLIGENCE: Record<number, string> = {
  1: "PQ",
  2: "EQ",
  3: "IQ",
  4: "LQ",
  5: "CQ",
  6: "TQ",
  7: "GQ",
};

export const INTELLIGENCE_LABEL: Record<string, string> = {
  PQ: "Fiziksel Zeka (PQ)",
  EQ: "Duygusal Zeka (EQ)",
  IQ: "Zihinsel Zeka (IQ)",
  LQ: "Sevgi/Anlam Zekası (LQ)",
  CQ: "Yaratıcı Zeka (CQ)",
  TQ: "Bilgelik Zekası (TQ)",
  GQ: "Bütünsel Zeka (GQ)",
};

export const LEVEL_LABEL_TR: Record<number, string> = {
  1: "L1 — Hayatta Kalma / Fiziksel",
  2: "L2 — Duygusal Farkındalık",
  3: "L3 — Analitik Zihin",
  4: "L4 — Sevgi / Anlam",
  5: "L5 — Yaratıcılık / Akış",
  6: "L6 — Bilgelik / Rehberlik",
  7: "L7 — Birlik / Aşkınlık",
};

export type Band = "daralmis" | "gelisen" | "dengeli";

export function bandFor(score: number): Band {
  if (score <= 40) return "daralmis";
  if (score <= 70) return "gelisen";
  return "dengeli";
}

export const BAND_LABEL: Record<Band, string> = {
  daralmis: "Daralmış işlev",
  gelisen: "Gelişen işlev",
  dengeli: "Dengeli işlev",
};

export const BAND_COPY: Record<Band, string> = {
  daralmis:
    "Bu seviyede işlev şu an daralmış görünüyor. Günlük yaşamda buradan gelen sinyaller yeterince kullanılamıyor olabilir; küçük, düzenli pratikler ve destekli çalışma en çok fark yaratacak alan burasıdır.",
  gelisen:
    "Bu seviyede işlev gelişmekte. Kaynaklar mevcut; farkındalık artırıldıkça ve pratik tekrarlandıkça daha istikrarlı bir kullanım oluşabilir.",
  dengeli:
    "Bu seviyede işlev dengeli. Buradan gelen kapasiteler diğer seviyeleri de besleyecek bir zemin sağlıyor; sürdürülebilirlik ve derinleştirme ön planda.",
};

export function computeScores(
  answers: { question_id: string; value: number }[],
  questions: { id: string; level: number; reverse_coded: boolean }[],
): {
  level_scores: Record<string, number>;
  intelligence_scores: Record<string, number>;
  summary_band: Record<string, Band>;
} {
  const qMap = new Map(questions.map((q) => [q.id, q] as const));
  const buckets: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const a of answers) {
    const q = qMap.get(a.question_id);
    if (!q) continue;
    const v = q.reverse_coded ? 6 - a.value : a.value;
    buckets[q.level]?.push(v);
  }
  const level_scores: Record<string, number> = {};
  const intelligence_scores: Record<string, number> = {};
  const summary_band: Record<string, Band> = {};
  for (let l = 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7; l <= 7; l = ((l + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7)) {
    const arr = buckets[l];
    const mean = arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
    const norm = arr.length ? Math.round(((mean - 1) / 4) * 100) : 0;
    const key = `L${l}`;
    level_scores[key] = norm;
    intelligence_scores[LEVEL_TO_INTELLIGENCE[l]] = norm;
    summary_band[key] = bandFor(norm);
  }
  return { level_scores, intelligence_scores, summary_band };
}

export function lowestTwoLevels(level_scores: Record<string, number>): number[] {
  const entries = Object.entries(level_scores).map(([k, v]) => [Number(k.slice(1)), v] as const);
  entries.sort((a, b) => a[1] - b[1]);
  return entries.slice(0, 2).map(([lvl]) => lvl);
}