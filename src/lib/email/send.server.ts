// Server-only shared email helper. Sends via Resend through the Lovable
// connector gateway. Never throws — logs errors so user-facing flows
// (orders, applications, inquiries) never break due to email failure.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";
const FROM = "PFA <bildirim@psychofunctionalanalysis.com>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.warn("[email] skipped — LOVABLE_API_KEY or RESEND_API_KEY missing");
    return { ok: false, error: "email_not_configured" };
  }
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
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
      console.error(`[email] gateway ${res.status}: ${body}`);
      return { ok: false, error: `gateway_${res.status}` };
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