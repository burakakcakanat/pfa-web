import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10).max(4000),
  website_hp: z.string().max(0).optional().default(""),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    if (data.website_hp && data.website_hp.length > 0) return { ok: true };
    try {
      const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
      const { renderEmail, esc } = await import("@/lib/email/templates");
      const to = await getAdminNotificationEmail();
      const bodyHtml = `
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#6b6355;width:120px">Gönderen</td><td>${esc(data.full_name)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">E-posta</td><td>${esc(data.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Konu</td><td>${esc(data.subject || "—")}</td></tr>
        </table>
        <p style="margin-top:14px"><strong>Mesaj</strong></p>
        <p style="white-space:pre-wrap">${esc(data.message)}</p>`;
      await sendEmail({
        to,
        replyTo: data.email,
        subject: `PFA — İletişim: ${data.subject || data.full_name}`,
        html: renderEmail({ title: "Yeni iletişim mesajı", bodyHtml }),
      });
    } catch (e) {
      console.error("[email] contact admin notify failed", e);
    }
    return { ok: true };
  });