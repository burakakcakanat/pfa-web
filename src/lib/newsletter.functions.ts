import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SEGMENTS = ["merakli", "profesyonel", "kurumsal"] as const;
const TARGETS = ["merakli", "profesyonel", "kurumsal", "tumu"] as const;

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  full_name: z.string().trim().max(120).optional().nullable(),
  segment: z.enum(SEGMENTS),
  consent: z.boolean(),
  source: z.string().max(40).optional().nullable(),
  website: z.string().max(200).optional().nullable(), // honeypot
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// -------- PUBLIC: subscribe --------
export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => subscribeSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.website && data.website.trim() !== "") {
      // honeypot triggered — pretend success
      return { ok: true };
    }
    if (!data.consent) throw new Error("KVKK onayı gerekli.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase().trim();

    // upsert-like: check if exists
    const { data: existing } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, unsubscribed_at")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("newsletter_subscribers")
        .update({
          segment: data.segment,
          full_name: data.full_name ?? null,
          consent: true,
          source: data.source ?? "footer",
          unsubscribed_at: null,
        })
        .eq("id", existing.id);
      return { ok: true };
    }

    const { error } = await supabaseAdmin.from("newsletter_subscribers").insert({
      email,
      full_name: data.full_name ?? null,
      segment: data.segment,
      consent: true,
      source: data.source ?? "footer",
    });
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

// -------- PUBLIC: unsubscribe --------
export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id")
      .eq("unsubscribe_token", data.token)
      .maybeSingle();
    if (!row) return { ok: false };
    await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true };
  });

// -------- ADMIN --------
export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, full_name, segment, source, consent, unsubscribed_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteNewsletterSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listNewsletterIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("newsletter_issues")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const issueSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  segment: z.enum(TARGETS),
  content_md: z.string().max(50000),
  scheduled_note: z.string().max(500).optional().nullable(),
});

export const upsertNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => issueSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("newsletter_issues")
        .update({
          title: data.title,
          segment: data.segment,
          content_md: data.content_md,
          scheduled_note: data.scheduled_note ?? null,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("newsletter_issues")
      .insert({
        title: data.title,
        segment: data.segment,
        content_md: data.content_md,
        scheduled_note: data.scheduled_note ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row!.id };
  });

export const deleteNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("newsletter_issues").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNewsletterConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return { emailConfigured: Boolean(process.env.RESEND_API_KEY) };
  });

// Minimal, safe markdown -> HTML renderer for email bodies.
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(esc(line.replace(/^\s*[-*]\s+/, "")))}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (!line.trim()) { out.push(""); continue; }
    if (/^#\s+/.test(line)) { out.push(`<h1>${inline(esc(line.replace(/^#\s+/, "")))}</h1>`); continue; }
    if (/^##\s+/.test(line)) { out.push(`<h2>${inline(esc(line.replace(/^##\s+/, "")))}</h2>`); continue; }
    if (/^###\s+/.test(line)) { out.push(`<h3>${inline(esc(line.replace(/^###\s+/, "")))}</h3>`); continue; }
    out.push(`<p>${inline(esc(line))}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}
function inline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0f766e">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function wrapEmailHtml(bodyHtml: string, unsubscribeUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f3ea;font-family:Inter,system-ui,sans-serif;color:#1a2a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf7;border:1px solid #e6dfcf;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eee5d0;text-align:center;font-family:'EB Garamond',Georgia,serif;font-size:20px;letter-spacing:.14em;color:#0f766e">PFA — PSİKO-FONKSİYONEL ANALİZ</td></tr>
        <tr><td style="padding:28px 32px;font-size:15px;line-height:1.7">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eee5d0;font-size:11px;color:#6b6355;text-align:center">
          Bu e-postayı PFA bültenine abone olduğunuz için aldınız.<br/>
          <a href="${unsubscribeUrl}" style="color:#6b6355;text-decoration:underline">Abonelikten ayrıl</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendResendEmail(_apiKey: string, to: string, subject: string, html: string) {
  const { sendEmail } = await import("@/lib/email/send.server");
  const r = await sendEmail({ to, subject, html });
  if (!r.ok) throw new Error(r.error ?? "send_failed");
}

export const sendNewsletterTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ issueId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY tanımlı değil.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: issue, error } = await supabaseAdmin
      .from("newsletter_issues")
      .select("title, content_md")
      .eq("id", data.issueId)
      .single();
    if (error || !issue) throw new Error("Sayı bulunamadı.");
    const { data: userRes } = await context.supabase.auth.getUser();
    const email = userRes.user?.email;
    if (!email) throw new Error("Yönetici e-postası bulunamadı.");
    const base = process.env.SITE_URL || "https://psychofunctionalanalysis.com";
    const unsubUrl = `${base}/bulten/ayril?token=00000000-0000-0000-0000-000000000000`;
    const html = wrapEmailHtml(mdToHtml(issue.content_md).replace(/{{unsubscribe_url}}/g, unsubUrl), unsubUrl);
    await sendResendEmail(apiKey, email, `[TEST] ${issue.title}`, html);
    return { ok: true, sentTo: email };
  });

export const sendNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ issueId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY tanımlı değil.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: issue, error } = await supabaseAdmin
      .from("newsletter_issues")
      .select("*")
      .eq("id", data.issueId)
      .single();
    if (error || !issue) throw new Error("Sayı bulunamadı.");
    // Çift gönderim koruması
    if (issue.status === "gonderildi") {
      return { ok: true, sent: issue.sent_count ?? 0, total: issue.sent_count ?? 0, alreadySent: true };
    }

    let q = supabaseAdmin
      .from("newsletter_subscribers")
      .select("email, unsubscribe_token, segment")
      .eq("consent", true)
      .eq("confirmed", true)
      .is("unsubscribed_at", null);
    if (issue.segment !== "tumu") q = q.eq("segment", issue.segment);
    const { data: subs, error: subsErr } = await q;
    if (subsErr) throw new Error(subsErr.message);
    const recipients = subs ?? [];

    const base = process.env.SITE_URL || "https://psychofunctionalanalysis.com";
    let sent = 0;
    const BATCH = 50;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.all(batch.map(async (s) => {
        const unsubUrl = `${base}/bulten/ayril?token=${s.unsubscribe_token}`;
        const html = wrapEmailHtml(mdToHtml(issue.content_md).replace(/{{unsubscribe_url}}/g, unsubUrl), unsubUrl);
        try {
          await sendResendEmail(apiKey, s.email, issue.title, html);
          sent += 1;
        } catch (e) {
          console.error("[newsletter] send failed", s.email, e);
        }
      }));
      if (i + BATCH < recipients.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await supabaseAdmin
      .from("newsletter_issues")
      .update({ status: "gonderildi", sent_at: new Date().toISOString(), sent_count: sent })
      .eq("id", data.issueId);

    return { ok: true, sent, total: recipients.length };
  });