export type CapacityCode = "U" | "Y" | "D" | "I" | "R";

export const CAPACITY_CODES: CapacityCode[] = ["U", "Y", "D", "I", "R"];

export const CAPACITY_LABEL: Record<CapacityCode, string> = {
  U: "Ustalık",
  Y: "Yaratıcılık",
  D: "Dirayet",
  I: "İrade",
  R: "Rutin",
};

export const SEVENQ_LEVEL_LABEL: Record<number, string> = {
  1: "L1 — Beka (PQ)",
  2: "L2 — Duygular (EQ)",
  3: "L3 — Rasyonalite (IQ)",
  4: "L4 — Sevgi (LQ)",
  5: "L5 — Kişisel Sanat (CQ)",
  6: "L6 — Bilgelik (TQ)",
  7: "L7 — Aydınlanma (GQ)",
};

export const SEVENQ_LEVEL_SHORT: Record<number, string> = {
  1: "Beka",
  2: "Duygular",
  3: "Rasyonalite",
  4: "Sevgi",
  5: "Kişisel Sanat",
  6: "Bilgelik",
  7: "Aydınlanma",
};

export const SEVENQ_LIKERT: { value: number; label: string }[] = [
  { value: 1, label: "Hiç uygulamıyorum" },
  { value: 2, label: "Nadiren" },
  { value: 3, label: "Ara sıra" },
  { value: 4, label: "Çoğunlukla" },
  { value: 5, label: "Yaşamımın parçası (rutinleşmiş)" },
];

export type SevenqBand = "uyuyan" | "uyanan" | "calisan" | "akortlu";

export const SEVENQ_BAND_LABEL: Record<SevenqBand, string> = {
  uyuyan: "Uyuyan kapasite",
  uyanan: "Uyanan",
  calisan: "Çalışan",
  akortlu: "Akortlu",
};

export function sevenqBand(score: number): SevenqBand {
  if (score < 40) return "uyuyan";
  if (score < 60) return "uyanan";
  if (score < 80) return "calisan";
  return "akortlu";
}

function norm(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  return Math.round(((mean - 1) / 4) * 100);
}

export type SevenqQuestionMeta = {
  id: string;
  level: number;
  capacity: CapacityCode;
  awareness_item: boolean;
};

export type SevenqCells = Record<string, Partial<Record<CapacityCode, number>>>;

export type SevenqScores = {
  level_scores: Record<string, number>;
  capacity_scores: Record<string, number> & { cells?: SevenqCells };
  total_score: number;
  akort: number;
  awareness_score: number;
};

export function computeSevenqScores(
  answers: { question_id: string; value: number }[],
  questions: SevenqQuestionMeta[],
): SevenqScores {
  const qMap = new Map(questions.map((q) => [q.id, q] as const));

  const levelBuckets: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  const capacityBuckets: Record<string, number[]> = { U: [], Y: [], D: [], I: [], R: [] };
  const cellBuckets: Record<string, number[]> = {};
  const awareness: number[] = [];

  for (const a of answers) {
    const q = qMap.get(a.question_id);
    if (!q) continue;
    levelBuckets[q.level]?.push(a.value);
    capacityBuckets[q.capacity]?.push(a.value);
    const cellKey = `L${q.level}|${q.capacity}`;
    (cellBuckets[cellKey] ??= []).push(a.value);
    if (q.awareness_item) awareness.push(a.value);
  }

  const level_scores: Record<string, number> = {};
  const levelValues: number[] = [];
  for (let l = 1; l <= 7; l++) {
    const s = norm(levelBuckets[l] ?? []);
    level_scores[`L${l}`] = s;
    levelValues.push(s);
  }

  const capacity_scores: Record<string, number> & { cells?: SevenqCells } = {};
  for (const c of CAPACITY_CODES) capacity_scores[c] = norm(capacityBuckets[c] ?? []);

  const cells: SevenqCells = {};
  for (const [key, vals] of Object.entries(cellBuckets)) {
    const [lvl, cap] = key.split("|") as [string, CapacityCode];
    (cells[lvl] ??= {})[cap] = norm(vals);
  }
  capacity_scores.cells = cells;

  // 7Q skoru: 7 seviyenin eşit ağırlıklı ortalaması
  const total_score = Math.round(levelValues.reduce((s, x) => s + x, 0) / 7);

  // Akort: seviye puanlarının standart sapmasından
  const mean = levelValues.reduce((s, x) => s + x, 0) / 7;
  const variance = levelValues.reduce((s, x) => s + (x - mean) ** 2, 0) / 7;
  const sd = Math.sqrt(variance);
  const akort = Math.round(Math.max(0, 100 - sd * 2.5));

  return {
    level_scores,
    capacity_scores,
    total_score,
    akort,
    awareness_score: norm(awareness),
  };
}

export function strongestLevel(level_scores: Record<string, number>): number {
  let best = 1;
  for (let l = 2; l <= 7; l++) if ((level_scores[`L${l}`] ?? 0) > (level_scores[`L${best}`] ?? 0)) best = l;
  return best;
}

export function weakestLevel(level_scores: Record<string, number>): number {
  let low = 1;
  for (let l = 2; l <= 7; l++) if ((level_scores[`L${l}`] ?? 0) < (level_scores[`L${low}`] ?? 0)) low = l;
  return low;
}

export type SevenqCell = { level: number; capacity: CapacityCode; score: number };

export function lowestCells(cells: SevenqCells | undefined, count = 3): SevenqCell[] {
  const flat: SevenqCell[] = [];
  for (const [lvlKey, caps] of Object.entries(cells ?? {})) {
    const level = Number(lvlKey.replace("L", ""));
    for (const [cap, score] of Object.entries(caps ?? {})) {
      if (typeof score === "number") flat.push({ level, capacity: cap as CapacityCode, score });
    }
  }
  return flat.sort((a, b) => a.score - b.score).slice(0, count);
}

export function developmentSuggestion(cell: SevenqCell): string {
  const level = SEVENQ_LEVEL_SHORT[cell.level] ?? `L${cell.level}`;
  const cap = CAPACITY_LABEL[cell.capacity];
  const byCapacity: Record<CapacityCode, string> = {
    U: `${level} alanında ${cap.toLocaleLowerCase("tr-TR")} en düşük hücre: burada beceriyi tekrar ve geri bildirimle inceltmek, kapasiteyi en hızlı açan hamle olur.`,
    Y: `${level} alanında ${cap.toLocaleLowerCase("tr-TR")} zayıf: bu seviyede alışılmış çözümün dışına çıkan küçük denemelere haftada bir yer açın.`,
    D: `${level} alanında ${cap.toLocaleLowerCase("tr-TR")} düşük: zorlandığınız anlarda kalma süresini kısa ve ölçülü biçimde uzatmak dayanıklılığı büyütür.`,
    I: `${level} alanında ${cap.toLocaleLowerCase("tr-TR")} düşük: niyeti tek ve somut bir eyleme indirip o eylemi tarih vermeden bırakmamak buradaki eşiği aşar.`,
    R: `${level} alanında ${cap.toLocaleLowerCase("tr-TR")} düşük: bu seviyedeki pratiği günün sabit bir saatine bağlamak, iradeyi harcamadan sürdürülebilirlik kazandırır.`,
  };
  return byCapacity[cell.capacity];
}
