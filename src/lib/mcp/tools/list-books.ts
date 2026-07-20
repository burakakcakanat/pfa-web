import { defineTool } from "@lovable.dev/mcp-js";

const BOOKS = [
  {
    title: "Psycho-Functional Analysis (PFA)",
    language: "EN",
    description: "A map of consciousness — from survival to unity.",
    purchaseUrl: "https://www.amazon.com/dp/B0H3BSWK1D",
    available: true,
  },
  {
    title: "PFA: Bilinç Çözümleme",
    language: "TR",
    description:
      "Bir bilinç haritası — bekadan birliğe. Terapistler, koçlar, eğitimciler ve kendini anlamaya yola çıkmış herkes için bir yol bulma aracı.",
    purchaseUrl: null,
    available: false,
    note: "Google Play'de yakında",
  },
  {
    title: "Human Consciousness Decoded",
    language: "EN",
    year: 2015,
    description: "Aydınlanmanın bilimi üzerine ilk eser; PFA modelinin kökleri.",
    purchaseUrl: null,
    available: false,
  },
];

export default defineTool({
  name: "list_books",
  title: "PFA kitaplarını listele",
  description:
    "Burak Akçakanat'ın Psİko-Fonksİyonel Analİz (PFA) kitaplarını başlık, dil, açıklama ve satın alma linkiyle döndürür.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(BOOKS, null, 2) }],
    structuredContent: { books: BOOKS },
  }),
});