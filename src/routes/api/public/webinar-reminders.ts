import { createFileRoute } from "@tanstack/react-router";

/**
 * Günlük webinar hatırlatma uç noktası. Zamanlanmış görev (pg_cron) her sabah
 * 08:00 (Europe/Istanbul) çağırır; o gün başlayacak oturumların katılımcılarına
 * tek seferlik hatırlatma e-postası gönderir.
 *
 * Yetkilendirme: site_settings üzerinde tutulan paylaşımlı token, çağıranın
 * x-cron-token başlığıyla eşleşmek zorunda. Token yoksa uç nokta kapalıdır.
 */

const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3, yıl boyu sabit

function istanbulDayWindowUtc(now: Date) {
  const local = new Date(now.getTime() + ISTANBUL_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - ISTANBUL_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

function reminderHtml(opts: {
  title: string;
  startsAt: string;
  joinUrl: string | null;
  notes: string | null;
}) {
  const time = new Date(opts.startsAt).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "long",
    timeStyle: "short",
  });
  const cta = opts.joinUrl
    ? `<p style="margin:24px 0"><a href="${opts.joinUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:15px">Yayına Katıl</a></p>
       <p style="font-size:13px;color:#6b6355">Bağlantı: ${opts.joinUrl}</p>`
    : `<p style="font-size:13px;color:#6b6355">Katılım bağlantısı en kısa sürede e-posta ile paylaşılacaktır.</p>`;
  return `<!doctype html><html><body style="margin:0;background:#f7f3ea;font-family:Inter,system-ui,sans-serif;color:#1a2a2e">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ea;padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf7;border:1px solid #e6dfcf;border-radius:8px;overflow:hidden">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #eee5d0;text-align:center;font-family:'EB Garamond',Georgia,serif;font-size:20px;letter-spacing:.14em;color:#0f766e">PFA — PSİKO-FONKSİYONEL ANALİZ</td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:1.7">
        <h2 style="font-family:'EB Garamond',Georgia,serif;margin:0 0 12px">Bugün: ${opts.title}</h2>
        <p>Kaydolduğunuz webinar <strong>bugün</strong> gerçekleşiyor.</p>
        <p><strong>Başlangıç:</strong> ${time} (Europe/Istanbul)</p>
        ${cta}
        ${opts.notes ? `<p style="font-size:13px;color:#6b6355">${opts.notes}</p>` : ""}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #eee5d0;font-size:11px;color:#6b6355;text-align:center">
        Bu e-postayı bu webinara kaydolduğunuz için aldınız.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function run(request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: tokenRow } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "cron_reminder_token")
    .maybeSingle();
  const expected = tokenRow?.value?.trim();
  const provided = request.headers.get("x-cron-token")?.trim();
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { startUtc, endUtc } = istanbulDayWindowUtc(new Date());
  const { data: sessions, error } = await supabaseAdmin
    .from("webinar_sessions")
    .select("id, product_id, title, starts_at, join_url, notes")
    .gte("starts_at", startUtc.toISOString())
    .lt("starts_at", endUtc.toISOString());
  if (error) {
    console.error("[webinar-reminders] session query failed", error.message);
    return new Response(JSON.stringify({ error: "query_failed" }), { status: 500 });
  }

  const { sendEmail } = await import("@/lib/email/send.server");
  let sent = 0;
  let skipped = 0;

  for (const s of sessions ?? []) {
    // Katılımcılar: ilgili ürün için ödemesi tamamlanmış siparişler.
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("product_id", s.product_id)
      .eq("status", "paid");
    const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean))] as string[];
    if (userIds.length === 0) continue;

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    const { data: already } = await supabaseAdmin
      .from("webinar_reminders")
      .select("email")
      .eq("webinar_session_id", s.id);
    const done = new Set((already ?? []).map((r) => String(r.email).toLowerCase()));

    const html = reminderHtml({
      title: s.title,
      startsAt: s.starts_at,
      joinUrl: s.join_url,
      notes: s.notes,
    });

    for (const p of profiles ?? []) {
      const email = p.email?.toLowerCase().trim();
      if (!email) continue;
      if (done.has(email)) { skipped += 1; continue; }
      const r = await sendEmail({
        to: email,
        subject: `Bugün: ${s.title} — PFA Webinar`,
        html,
      });
      if (!r.ok) {
        console.error("[webinar-reminders] send failed", email, r.error);
        continue;
      }
      await supabaseAdmin
        .from("webinar_reminders")
        .insert({ webinar_session_id: s.id, email, user_id: p.id });
      sent += 1;
    }
  }

  console.log(`[webinar-reminders] sessions=${(sessions ?? []).length} sent=${sent} skipped=${skipped}`);
  return new Response(JSON.stringify({ ok: true, sessions: (sessions ?? []).length, sent, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/webinar-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});
