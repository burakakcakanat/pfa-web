import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

function nextWeekdays(count: number) {
  const days: string[] = [];
  const cursor = new Date();
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
}

export default defineTool({
  name: "get_session_availability",
  title: "Seans müsaitliğini göster",
  description:
    "Burak Akçakanat ile 60 dakikalık birebir online danışmanlık (150 USD, Zoom, Europe/Istanbul) için uygun tarih ve saat aralıklarını döndürür. Hafta içi 10:00–18:00.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe("Kaç hafta içi günü döndürüleceği (varsayılan 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ days }) => {
    const dates = nextWeekdays(days ?? 10);
    const availability = {
      service: "PFA birebir danışmanlık",
      duration_minutes: 60,
      price_usd: 150,
      medium: "Zoom (online)",
      timezone: "Europe/Istanbul",
      dates,
      time_slots: SLOTS,
      note: "Talep göndermek için `submit_inquiry` aracını `type: \"session\"` ile kullanın.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(availability, null, 2) }],
      structuredContent: availability,
    };
  },
});