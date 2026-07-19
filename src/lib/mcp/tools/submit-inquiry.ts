import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "submit_inquiry",
  title: "Başvuru / iletişim talebi gönder",
  description:
    "Değerlendirme (PA Ölçeği), seans rezervasyonu, webinar kaydı veya genel iletişim için başvuru gönderir. Başvuru sunucu loglarına düşer; Burak ekibi e-posta ile geri döner.",
  inputSchema: {
    type: z
      .enum(["assessment", "session", "webinar", "training", "contact"])
      .describe("Başvuru türü."),
    name: z.string().min(2).max(120).describe("Başvuranın adı soyadı."),
    email: z.string().email().describe("Geri dönüş için e-posta."),
    message: z
      .string()
      .min(3)
      .max(2000)
      .describe("Konu, tercih edilen tarih/saat veya not."),
    preferred_date: z
      .string()
      .optional()
      .describe("Seans/webinar için tercih edilen tarih (YYYY-MM-DD)."),
    preferred_time: z
      .string()
      .optional()
      .describe("Tercih edilen saat (HH:MM, Europe/Istanbul)."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: (input) => {
    const receivedAt = new Date().toISOString();
    console.log("[PFA MCP submit_inquiry]", { receivedAt, ...input });
    const confirmation = {
      status: "received" as const,
      received_at: receivedAt,
      type: input.type,
      message:
        "Başvurunuz alındı. Burak veya ekibi kısa süre içinde belirttiğiniz e-postadan sizinle iletişime geçecek.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(confirmation, null, 2) }],
      structuredContent: confirmation,
    };
  },
});