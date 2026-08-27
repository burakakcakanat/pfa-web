// Server-only shared email helper. Sends via Resend's REST API directly
// using RESEND_API_KEY_DIRECT. Never throws — logs errors so user-facing
// flows (orders, applications, inquiries) never break due to email failure.

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "PFA <bildirim@psychofunctionalanalysis.com>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY_DIRECT;
  if (!resendKey) {
    console.warn("[email] skipped — RESEND_API_KEY_DIRECT missing");
    return { ok: false, error: "email_not_configured" };
  }
  // Test pasaportları (@pfa.internal) bildirim gönderiminden muaftır.
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter(
    (addr) => !addr.trim().toLowerCase().endsWith("@pfa.internal"),
  );
  if (recipients.length === 0) {
    return { ok: true };
  }
  input = { ...input, to: recipients };
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] resend ${res.status}: ${body}`);
      return { ok: false, error: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send exception", e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function getAdminNotificationEmail(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "admin_notification_email")
      .maybeSingle();
    const val = data?.value?.trim();
    if (val && /.+@.+\..+/.test(val)) return val;
  } catch (e) {
    console.error("[email] admin email lookup failed", e);
  }
  return "corteqssocial@gmail.com";
}