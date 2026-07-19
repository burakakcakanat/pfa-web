import { defineTool } from "@lovable.dev/mcp-js";

const WEBINARS = [
  {
    title: "Yedi Seviyeye Giriş",
    date: "2026-02-14T19:00:00+03:00",
    timezone: "Europe/Istanbul",
    priceUsd: 25,
    capacity: 100,
    level: "Başlangıç",
    description: "PFA modelinin yedi seviyesine bütünsel bir bakış.",
  },
  {
    title: "İşlevsel Farkındalık Atölyesi",
    date: "2026-03-07T19:00:00+03:00",
    timezone: "Europe/Istanbul",
    priceUsd: 40,
    capacity: 60,
    level: "Ara",
    description: "Kendi haritanız üzerinde çalıştıran uygulamalı bir seans.",
  },
];

export default defineTool({
  name: "list_webinars",
  title: "Yaklaşan webinarları listele",
  description:
    "Yaklaşan PFA webinarlarını tarih, saat, fiyat (USD), kontenjan ve seviye bilgisiyle döndürür. Tüm saatler Europe/Istanbul.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(WEBINARS, null, 2) }],
    structuredContent: { webinars: WEBINARS },
  }),
});