// Server-only newsletter internals. Single source of truth for:
//  - email rendering (markdown -> branded HTML, artwork)
//  - subscribe / confirm / global-unsubscribe core logic
//  - suppression hard guard
// Both the public token flows and the authenticated account-menu actions call
// these, so there is exactly one code path per behaviour.

// Hard guard: never dispatch to an address that opted out, whatever the
// recipient list says. Returns the allowed list plus how many were blocked.
export async function filterSuppressed<T extends { email: string }>(
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
export function mdToHtml(md: string): string {
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

export type Artwork = {
  url: string;
  side: "left" | "right" | "top" | "bottom";
  width: number;
  opacity: number;
  alt: string;
} | null;

export async function loadArtwork(supabaseAdmin: any): Promise<Artwork> {
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
    const side: "left" | "right" | "top" | "bottom" =
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

export function wrapEmailHtml(bodyHtml: string, unsubscribeUrl: string, art: Artwork = null): string {
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
  const footer = unsubscribeUrl
    ? `<tr><td style="padding:20px 32px;border-top:1px solid #eee5d0;font-size:11px;color:#6b6355;text-align:center">
          Bu e-postayı PFA bültenine abone olduğunuz için aldınız.<br/>
          <a href="${unsubscribeUrl}" style="color:#6b6355;text-decoration:underline">Abonelikten ayrıl</a>
        </td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f7f3ea;font-family:Inter,system-ui,sans-serif;color:#1a2a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf7;border:1px solid #e6dfcf;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eee5d0;text-align:center;font-family:'EB Garamond',Georgia,serif;font-size:20px;letter-spacing:.14em;color:#0f766e">PFA — PSİKO-FONKSİYONEL ANALİZ</td></tr>
        ${topRow}
        ${bodyRow}
        ${bottomRow}
        ${footer}
      </table>
    </td></tr>
  </table></body></html>`;
}

export async function sendResendEmail(to: string, subject: string, html: string) {
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

export function siteBase(): string {
  return process.env.SITE_URL || "https://psychofunctionalanalysis.com";
}

// İlk (en eski) bülten sayısını hoş geldin mektubu olarak gönderir.
export async function sendWelcomeIssue(supabaseAdmin: any, email: string) {
  const { data: issue } = await supabaseAdmin
    .from("newsletter_issues")
    .select("title, content_md")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!issue) {
    console.warn("[newsletter] welcome skipped — no issue exists yet", email);
    return;
  }
  const { data: sub } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("unsubscribe_token")
    .eq("email", email)
    .maybeSingle();
  const base = siteBase();
  const unsubUrl = sub?.unsubscribe_token
    ? `${base}/bulten/ayril?token=${sub.unsubscribe_token}`
    : `${base}/bulten/ayril`;
  const art = await loadArtwork(supabaseAdmin);
  const html = wrapEmailHtml(
    mdToHtml(issue.content_md).replace(/{{unsubscribe_url}}/g, unsubUrl),
    unsubUrl,
    art,
  );
  await sendResendEmail(email, issue.title, html);
}

// Çift onay (double opt-in) e-postası.
export async function sendConfirmationEmail(
  supabaseAdmin: any,
  email: string,
  confirmToken: string,
  unsubscribeToken: string | null,
  locale: "tr" | "en" = "tr",
) {
  const base = siteBase();
  const confirmUrl = `${base}/bulten/onayla?token=${confirmToken}`;
  const unsubUrl = unsubscribeToken ? `${base}/bulten/ayril?token=${unsubscribeToken}` : "";
  const body =
    locale === "en"
      ? `
    <h2 style="font-family:'EB Garamond',Georgia,serif;margin:0 0 12px">Confirm your subscription</h2>
    <p>We have received your request to join the PFA newsletter. One email a month: excerpts from the book and selected new articles.</p>
    <p style="margin:24px 0">
      <a href="${confirmUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:15px">Confirm subscription</a>
    </p>
    <p style="font-size:13px;color:#6b6355">If the button does not work, paste this address into your browser:<br/>${confirmUrl}</p>
    <p style="font-size:13px;color:#6b6355">If you did not sign up, you can ignore this email; nothing is sent until it is confirmed.</p>`
      : `
    <h2 style="font-family:'EB Garamond',Georgia,serif;margin:0 0 12px">Aboneliğinizi onaylayın</h2>
    <p>PFA Bültenine kayıt talebiniz alındı. Ayda bir e-posta: kitaptan bölümler ve yeni blog yazılarından seçkiler.</p>
    <p style="margin:24px 0">
      <a href="${confirmUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:15px">Aboneliği Onayla</a>
    </p>
    <p style="font-size:13px;color:#6b6355">Bağlantı çalışmazsa bu adresi tarayıcınıza yapıştırın:<br/>${confirmUrl}</p>
    <p style="font-size:13px;color:#6b6355">Bu kaydı siz yapmadıysanız bu e-postayı yok sayabilirsiniz; onaylanmadan bülten gönderilmez.</p>`;
  const html = wrapEmailHtml(body, unsubUrl, null);
  await sendResendEmail(
    email,
    locale === "en"
      ? "PFA newsletter — confirm your subscription"
      : "PFA Bülteni — aboneliğinizi onaylayın",
    html,
  );
}

export type SubscribeCoreInput = {
  email: string;
  full_name?: string | null;
  segment: "merakli" | "profesyonel" | "kurumsal";
  source?: string | null;
};

/**
 * Tek abonelik yolu: satırı oluşturur/tazeler, önceki global bastırmayı kaldırır,
 * onaylı değilse onay e-postası gönderir, onaylıysa hoş geldin sayısını yollar.
 * E-posta hatası abonelik akışını bozmaz ama loglanır ve dönüş değerinde görünür.
 */
export async function subscribeCore(
  supabaseAdmin: any,
  input: SubscribeCoreInput,
): Promise<{ ok: true; state: "confirmed" | "pending"; emailSent: boolean; emailError?: string }> {
  const email = input.email.toLowerCase().trim();

  // Explicit new opt-in lifts any previous global suppression for this address.
  await supabaseAdmin.from("newsletter_suppressions").delete().eq("email", email);

  const { data: existing } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, confirmed, confirm_token, unsubscribe_token")
    .eq("email", email)
    .maybeSingle();

  let row = existing;
  if (existing) {
    const { data: updated } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({
        segment: input.segment,
        full_name: input.full_name ?? null,
        consent: true,
        source: input.source ?? "footer",
        unsubscribed_at: null,
      })
      .eq("id", existing.id)
      .select("id, confirmed, confirm_token, unsubscribe_token")
      .maybeSingle();
    row = updated ?? existing;
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({
        email,
        full_name: input.full_name ?? null,
        segment: input.segment,
        consent: true,
        source: input.source ?? "footer",
      })
      .select("id, confirmed, confirm_token, unsubscribe_token")
      .maybeSingle();
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    row = inserted ?? null;
    if (!row) {
      const { data: refetched } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("id, confirmed, confirm_token, unsubscribe_token")
        .eq("email", email)
        .maybeSingle();
      row = refetched;
    }
  }

  if (!process.env.RESEND_API_KEY_DIRECT) {
    console.error("[newsletter] subscribe: RESEND_API_KEY_DIRECT missing — no email sent", email);
    return { ok: true, state: row?.confirmed ? "confirmed" : "pending", emailSent: false, emailError: "email_not_configured" };
  }

  try {
    if (row?.confirmed) {
      await sendWelcomeIssue(supabaseAdmin, email);
      return { ok: true, state: "confirmed", emailSent: true };
    }
    await sendConfirmationEmail(
      supabaseAdmin,
      email,
      String(row?.confirm_token ?? ""),
      row?.unsubscribe_token ? String(row.unsubscribe_token) : null,
    );
    return { ok: true, state: "pending", emailSent: true };
  } catch (e) {
    console.error("[newsletter] subscribe email failed", email, e);
    return {
      ok: true,
      state: row?.confirmed ? "confirmed" : "pending",
      emailSent: false,
      emailError: e instanceof Error ? e.message : "unknown",
    };
  }
}

/** Onay bağlantısı: confirmed=true yapar ve hoş geldin sayısını gönderir. */
export async function confirmCore(
  supabaseAdmin: any,
  token: string,
): Promise<{ ok: boolean; alreadyConfirmed?: boolean }> {
  const { data: row } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, email, confirmed")
    .eq("confirm_token", token)
    .maybeSingle();
  if (!row) return { ok: false };
  if (row.confirmed) return { ok: true, alreadyConfirmed: true };
  await supabaseAdmin
    .from("newsletter_subscribers")
    .update({ confirmed: true, confirmed_at: new Date().toISOString(), unsubscribed_at: null })
    .eq("id", row.id);
  await supabaseAdmin.from("newsletter_suppressions").delete().eq("email", row.email.toLowerCase());
  try {
    if (process.env.RESEND_API_KEY_DIRECT) await sendWelcomeIssue(supabaseAdmin, row.email.toLowerCase());
  } catch (e) {
    console.error("[newsletter] welcome after confirm failed", row.email, e);
  }
  return { ok: true };
}

/**
 * Tek global çıkış yolu: adresin bütün satırlarını unsubscribed yapar ve kalıcı
 * bastırma satırını yazar. Token akışı ve hesap menüsü aynı fonksiyonu kullanır.
 */
export async function unsubscribeCore(
  supabaseAdmin: any,
  email: string,
  source: "link" | "account",
): Promise<{ ok: true }> {
  const addr = email.toLowerCase().trim();
  const now = new Date().toISOString();
  await supabaseAdmin.from("newsletter_subscribers").update({ unsubscribed_at: now }).eq("email", addr);
  await supabaseAdmin
    .from("newsletter_suppressions")
    .upsert({ email: addr, unsubscribed_at: now, source }, { onConflict: "email" });
  return { ok: true };
}
