import { defineTool } from "@lovable.dev/mcp-js";

const LEVELS = [
  { level: 1, name: "Survival / Autonomous Consciousness", tr: "Beka / Otonom Bilinç" },
  { level: 2, name: "Emotion / Reactive Consciousness", tr: "Duygu / Tepkisel Bilinç" },
  { level: 3, name: "Ego / Personal Consciousness", tr: "Ego / Kişisel Bilinç" },
  { level: 4, name: "Heart / Relational Consciousness", tr: "Kalp / İlişkisel Bilinç" },
  { level: 5, name: "Voice / Creative Consciousness", tr: "Ses / Yaratıcı Bilinç" },
  { level: 6, name: "Insight / Intuitive Consciousness", tr: "Sezgi / İçgörü Bilinci" },
  { level: 7, name: "Enlightenment / Oneness", tr: "Aydınlanma / Birlik" },
];

const OVERVIEW = {
  title: "Psiko-Fonksiyonel Analiz (PFA)",
  author: "Burak Akçakanat",
  summary:
    "İnsan bilincini yedi işlevsel seviyeye ayıran bir harita. Terapistler, koçlar ve kendini anlamak isteyen herkes için yol bulma aracı.",
  offerings: ["Kitaplar", "PA Ölçeği (değerlendirme)", "Birebir seanslar", "Webinarlar", "Eğitim"],
  levels: LEVELS,
  website_pages: [
    "/", "/kitaplar", "/degerlendirme", "/seanslar", "/webinarlar",
    "/egitim", "/blog", "/videolar", "/hakkinda", "/iletisim",
  ],
};

export default defineTool({
  name: "pfa_overview",
  title: "PFA hakkında genel bilgi",
  description:
    "PFA modelinin özeti, yedi bilinç seviyesi ve sitedeki tüm sayfa yollarını döndürür. İlk keşif için kullanışlı.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(OVERVIEW, null, 2) }],
    structuredContent: OVERVIEW,
  }),
});