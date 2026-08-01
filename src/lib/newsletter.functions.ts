import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";

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
      return { ok: true };
    }
    if (!data.consent) throw new Error("KVKK onayı gerekli.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase().trim();

    // Explicit new opt-in lifts any previous global suppression for this address.
    await supabaseAdmin.from("newsletter_suppressions").delete().eq("email", email);

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
    const email = row.email.toLowerCase().trim();
    // 1) mark EVERY row for this address as unsubscribed (all segments)
    await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", email);
    // 2) permanent global suppression, independent of subscriber rows
    await supabaseAdmin
      .from("newsletter_suppressions")
      .upsert({ email, unsubscribed_at: new Date().toISOString(), source: "link" }, { onConflict: "email" });
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

// Hard guard: never dispatch to an address that opted out, whatever the
// recipient list says. Returns the allowed list plus how many were blocked.
async function filterSuppressed<T extends { email: string }>(
  supabaseAdmin: any,
  recipients: T[],
): Promise<{ allowed: T[]; suppressed: number }> {
  if (recipients.length === 0) return { allowed: [], suppressed: 0 };
  const emails = [...new Set(recipients.map((r) => r.email.toLowerCase().trim()))];
  const blocked = new Set<string>();
  const CHUNK = 200;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const [{ data: supp }, { data: unsub }] = await Promise.all([
      supabaseAdmin.from("newsletter_suppressions").select("email").in("email", chunk),
      supabaseAdmin
        .from("newsletter_subscribers")
        .select("email, unsubscribed_at")
        .in("email", chunk)
        .not("unsubscribed_at", "is", null),
    ]);
    for (const r of supp ?? []) blocked.add(String(r.email).toLowerCase());
    for (const r of unsub ?? []) blocked.add(String(r.email).toLowerCase());
  }
  const seen = new Set<string>();
  const allowed: T[] = [];
  let suppressed = 0;
  for (const r of recipients) {
    const e = r.email.toLowerCase().trim();
    if (blocked.has(e)) { suppressed += 1; continue; }
    if (seen.has(e)) continue;
    seen.add(e);
    allowed.push(r);
  }
  return { allowed, suppressed };
}

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

type Artwork = {
  url: string;
  side: "left" | "right" | "top" | "bottom";
  width: number;
  opacity: number;
  alt: string;
} | null;

async function loadArtwork(supabaseAdmin: any): Promise<Artwork> {
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "newsletter_bg_image_url",
        "newsletter_bg_side",
        "newsletter_bg_width",
        "newsletter_bg_opacity",
        "newsletter_bg_alt",
      ]);
    const map: Record<string, string> = {};
    for (const r of data ?? []) if (r.value) map[r.key] = String(r.value).trim();
    const url = map["newsletter_bg_image_url"];
    if (!url || !/^https?:\/\//i.test(url)) return null;
    const rawSide = map["newsletter_bg_side"];
    const side: Artwork extends null ? never : "left" | "right" | "top" | "bottom" =
      rawSide === "left" || rawSide === "top" || rawSide === "bottom" ? rawSide : "right";
    const width = Math.min(560, Math.max(40, Number(map["newsletter_bg_width"]) || 96));
    const opacity = Math.min(100, Math.max(5, Number(map["newsletter_bg_opacity"]) || 50)) / 100;
    return { url, side, width, opacity, alt: map["newsletter_bg_alt"] ?? "" };
  } catch {
    return null;
  }
}

// Artwork is always a real <img> (never a CSS background, which Outlook and
// several webmail clients drop). Blocked/broken images collapse to an empty
// strip: no broken-image icon, no layout shift, letter stays readable.
function artworkCell(art: Artwork): string {
  if (!art) return "";
  const w = Math.round(art.width);
  return `<td width="${w}" valign="top" style="width:${w}px;padding:0;line-height:0;font-size:0;background:#fffdf7">
    <img src="${art.url}" width="${w}" alt="${escAttr(art.alt)}" border="0" style="display:block;width:${w}px;max-width:${w}px;height:auto;border:0;outline:none;text-decoration:none;opacity:${art.opacity}" />
  </td>`;
}

function escAttr(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function artworkEdgeRow(art: Artwork): string {
  if (!art) return "";
  const w = Math.min(560, Math.round(art.width));
  return `<tr><td align="center" style="padding:0;line-height:0;font-size:0;background:#fffdf7">
    <img src="${art.url}" width="${w}" alt="${escAttr(art.alt)}" border="0" style="display:block;width:${w}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;opacity:${art.opacity}" />
  </td></tr>`;
}

function wrapEmailHtml(bodyHtml: string, unsubscribeUrl: string, art: Artwork = null): string {
  const sideArt = art && (art.side === "left" || art.side === "right") ? art : null;
  const left = sideArt?.side === "left" ? artworkCell(sideArt) : "";
  const right = sideArt?.side === "right" ? artworkCell(sideArt) : "";
  const topRow = art?.side === "top" ? artworkEdgeRow(art) : "";
  const bottomRow = art?.side === "bottom" ? artworkEdgeRow(art) : "";
  const bodyRow = sideArt
    ? `<tr><td style="padding:0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${left}
          <td valign="top" style="padding:28px 32px;font-size:15px;line-height:1.7">${bodyHtml}</td>
          ${right}
        </tr></table>
      </td></tr>`
    : `<tr><td style="padding:28px 32px;font-size:15px;line-height:1.7">${bodyHtml}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f7f3ea;font-family:Inter,system-ui,sans-serif;color:#1a2a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf7;border:1px solid #e6dfcf;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eee5d0;text-align:center;font-family:'EB Garamond',Georgia,serif;font-size:20px;letter-spacing:.14em;color:#0f766e">PFA — PSİKO-FONKSİYONEL ANALİZ</td></tr>
        ${topRow}
        ${bodyRow}
        ${bottomRow}
        <tr><td style="padding:20px 32px;border-top:1px solid #eee5d0;font-size:11px;color:#6b6355;text-align:center">
          Bu e-postayı PFA bültenine abone olduğunuz için aldınız.<br/>
          <a href="${unsubscribeUrl}" style="color:#6b6355;text-decoration:underline">Abonelikten ayrıl</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendResendEmail(to: string, subject: string, html: string) {
  const { sendEmail } = await import("@/lib/email/send.server");
  const r = await sendEmail({ to, subject, html });
  if (!r.ok) {
    const reason = r.error ?? "send_failed";
    throw new Error(
      reason === "email_not_configured"
        ? "E-posta gönderimi yapılandırılmamış (RESEND_API_KEY_DIRECT eksik)."
        : `E-posta gönderilemedi: ${reason}`,
    );
  }
}

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
    const base = process.env.SITE_URL || "https://psychofunctionalanalysis.com";
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

    const base = process.env.SITE_URL || "https://psychofunctionalanalysis.com";
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