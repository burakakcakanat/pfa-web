import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";
import {
  confirmCore,
  filterSuppressed,
  loadArtwork,
  mdToHtml,
  sendResendEmail,
  siteBase,
  subscribeCore,
  unsubscribeCore,
  wrapEmailHtml,
} from "@/lib/newsletter-core.server";

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
  .inputValidator((d: unknown) => parseFriendly(subscribeSchema, d))
  .handler(async ({ data }) => {
    if (data.website && data.website.trim() !== "") {
      // honeypot triggered — pretend success
      return { ok: true as const, state: "pending" as const, emailSent: false };
    }
    if (!data.consent) throw new Error("KVKK onayı gerekli.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return subscribeCore(supabaseAdmin, {
      email: data.email,
      full_name: data.full_name ?? null,
      segment: data.segment,
      source: data.source ?? "footer",
    });
  });

// -------- PUBLIC: confirm (double opt-in) --------
export const confirmNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return confirmCore(supabaseAdmin, data.token);
  });

// -------- PUBLIC: unsubscribe --------
// Standalone, token-based, NO auth required. Global: opting out stops every
// segment and every future send for that address.
export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email")
      .eq("unsubscribe_token", data.token)
      .maybeSingle();
    if (!row) return { ok: false };
    return unsubscribeCore(supabaseAdmin, row.email, "link");
  });

// -------- ADMIN --------
export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, full_name, segment, source, consent, confirmed, confirmed_at, unsubscribed_at, created_at")
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
    return {
      emailConfigured: Boolean(process.env.RESEND_API_KEY_DIRECT || process.env.RESEND_API_KEY),
    };
  });

// -------- ADMIN: unsubscribed contacts --------
export const listNewsletterUnsubscribed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: subs }, { data: supp }] = await Promise.all([
      supabaseAdmin
        .from("newsletter_subscribers")
        .select("email, segment, unsubscribed_at, created_at"),
      supabaseAdmin
        .from("newsletter_suppressions")
        .select("email, unsubscribed_at, source"),
    ]);

    const byEmail = new Map<string, { email: string; segments: string[]; unsubscribed_at: string | null; source: string | null }>();
    for (const s of supp ?? []) {
      byEmail.set(s.email, { email: s.email, segments: [], unsubscribed_at: s.unsubscribed_at, source: s.source ?? null });
    }
    let active = 0;
    for (const r of subs ?? []) {
      const email = r.email.toLowerCase();
      if (!r.unsubscribed_at && !byEmail.has(email)) { active += 1; continue; }
      const cur = byEmail.get(email) ?? { email, segments: [], unsubscribed_at: r.unsubscribed_at, source: null };
      if (!cur.segments.includes(r.segment)) cur.segments.push(r.segment);
      if (!cur.unsubscribed_at) cur.unsubscribed_at = r.unsubscribed_at;
      byEmail.set(email, cur);
    }
    const rows = [...byEmail.values()].sort((a, b) =>
      (b.unsubscribed_at ?? "").localeCompare(a.unsubscribed_at ?? ""),
    );
    return { rows, activeCount: active, unsubscribedCount: rows.length };
  });


export const sendNewsletterTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ issueId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!process.env.RESEND_API_KEY_DIRECT) {
      throw new Error("E-posta gönderimi yapılandırılmamış (RESEND_API_KEY_DIRECT eksik).");
    }
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
    const base = siteBase();
    // Use the admin's OWN real token when they are a subscriber, so the test
    // mail's unsubscribe link actually works instead of being a dead dummy.
    const { data: own } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("unsubscribe_token")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    const unsubUrl = own?.unsubscribe_token
      ? `${base}/bulten/ayril?token=${own.unsubscribe_token}`
      : `${base}/bulten/ayril`;
    const art = await loadArtwork(supabaseAdmin);
    const html = wrapEmailHtml(mdToHtml(issue.content_md).replace(/{{unsubscribe_url}}/g, unsubUrl), unsubUrl, art);
    await sendResendEmail(email, `[TEST] ${issue.title}`, html);
    return { ok: true, sentTo: email };
  });

export const sendNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ issueId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!process.env.RESEND_API_KEY_DIRECT) {
      throw new Error("E-posta gönderimi yapılandırılmamış (RESEND_API_KEY_DIRECT eksik).");
    }
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
      // Çift onay: yalnızca aboneliğini onaylamış adreslere gönderilir.
      .eq("confirmed", true)
      .is("unsubscribed_at", null);
    if (issue.segment !== "tumu") q = q.eq("segment", issue.segment);
    const { data: subs, error: subsErr } = await q;
    if (subsErr) throw new Error(subsErr.message);
    // HARD GUARD immediately before dispatch: drop anyone globally suppressed
    // or unsubscribed on any row, plus duplicates.
    const { allowed: recipients, suppressed } = await filterSuppressed(supabaseAdmin, subs ?? []);
    console.log(
      `[newsletter] issue=${data.issueId} candidates=${(subs ?? []).length} suppressed=${suppressed} recipients=${recipients.length}`,
    );

    const base = siteBase();
    const art = await loadArtwork(supabaseAdmin);
    let sent = 0;
    const BATCH = 50;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.all(batch.map(async (s) => {
        const unsubUrl = `${base}/bulten/ayril?token=${s.unsubscribe_token}`;
        const html = wrapEmailHtml(mdToHtml(issue.content_md).replace(/{{unsubscribe_url}}/g, unsubUrl), unsubUrl, art);
        try {
          await sendResendEmail(s.email, issue.title, html);
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

    return { ok: true, sent, total: recipients.length, suppressed };
  });