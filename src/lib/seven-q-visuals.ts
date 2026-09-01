// 7Q illüstrasyon seti. Dosyalar admin > Görseller (site-media) üzerinden
// bu adlarla yüklenir; yükleme yapıldığı anda kart görseli otomatik görünür.
export type SevenQVisual = {
  level: number;
  code: string;
  filename: string;
  tr: string;
  en: string;
};

export const SEVEN_Q_VISUALS: readonly SevenQVisual[] = [
  { level: 1, code: "PQ", filename: "7q-pq-fizyolojik.png", tr: "Fizyolojik Zekâ", en: "Physiological Intelligence" },
  { level: 2, code: "EQ", filename: "7q-eq-duygusal.png", tr: "Duygusal Zekâ", en: "Emotional Intelligence" },
  { level: 3, code: "IQ", filename: "7q-iq-rasyonel.png", tr: "Rasyonel Zekâ", en: "Rational Intelligence" },
  { level: 4, code: "LQ", filename: "7q-lq-sevgi.png", tr: "Sevgi Zekâsı", en: "Love Intelligence" },
  { level: 5, code: "CQ", filename: "7q-cq-yaraticilik.png", tr: "Yaratıcılık", en: "Creativity Intelligence" },
  { level: 6, code: "TQ", filename: "7q-tq-bilgelik.png", tr: "Bilgelik", en: "Wisdom Intelligence" },
  { level: 7, code: "GQ", filename: "7q-gq-butunsel.png", tr: "Bütünsel Zekâ", en: "Integral Intelligence" },
] as const;

export const SEVEN_Q_FILENAMES = SEVEN_Q_VISUALS.map((v) => v.filename);
