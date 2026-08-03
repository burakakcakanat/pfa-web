import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "submit_inquiry",
  title: "Başvuru / iletişim talebi gönder",
  description:
    "Değerlendirme (PFA Ölçeği), seans rezervasyonu, webinar kaydı veya genel iletişim için başvuru gönderir. Başvuru sunucu loglarına düşer; Burak ekibi e-posta ile geri döner.",
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
  handler: async (input) => {
    const receivedAt = new Date().toISOString();

    // Başvuru, site iletişim formuyla aynı tabloya yazılır; böylece admin
    // panelinde görünür ve gerçekten yanıtlanabilir.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const details = [
      input.preferred_date ? `Tercih edilen tarih: ${input.preferred_date}` : null,
      input.preferred_time ? `Tercih edilen saat: ${input.preferred_time}` : null,
    ].filter(Boolean);
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      full_name: input.name,
      email: input.email,
      subject: `MCP başvurusu — ${input.type}`,
      message: [input.message, ...details].join("\n"),
    });
    if (error) {
      console.error("[PFA MCP submit_inquiry] persist failed", error.message);
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: "Başvuru kaydedilemedi. Lütfen kısa süre sonra tekrar deneyin veya info@psychofunctionalanalysis.com adresine yazın.",
          },
        ],
      };
    }

    const confirmation = {
      status: "received" as const,
      received_at: receivedAt,
      type: input.type,
      message:
        "Başvurunuz kaydedildi. Burak veya ekibi kısa süre içinde belirttiğiniz e-postadan sizinle iletişime geçecek.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(confirmation, null, 2) }],
      structuredContent: confirmation,
    };
  },
});