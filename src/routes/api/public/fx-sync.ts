import { createFileRoute } from "@tanstack/react-router";

/**
 * Günlük kur çekimi + otomatik fiyat türetme uç noktası.
 * Zamanlanmış görev (pg_cron) günde bir kez çağırır.
 *
 * Yetkilendirme: site_settings.cron_reminder_token ile x-cron-token başlığı
 * eşleşmek zorunda (mevcut cron deseninin aynısı).
 */

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

  const { fetchTcmbRates, persistFxSnapshot, runDerivation, derivationReportHtml } = await import(
    "@/lib/fx.server"
  );
  const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");

  // Kur çekimi başarısız olursa sessizce geçilmez — admin'e bildirilir.
  try {
    const snap = await fetchTcmbRates();
    await persistFxSnapshot(supabaseAdmin as never, snap);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    console.error("[fx-sync] kur çekimi başarısız", msg);
    const to = await getAdminNotificationEmail();
    await sendEmail({
      to,
      subject: "PFA — TCMB kur çekimi başarısız",
      html: `<p>Günlük kur çekimi başarısız oldu.</p><p><strong>Hata:</strong> ${msg}</p>
             <p>Fiyat türetme bu tur atlandı; son yayınlanan kur geçerli kalır.</p>`,
    });
    return new Response(JSON.stringify({ ok: false, error: "fx_fetch_failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { snapshot, outcomes } = await runDerivation(supabaseAdmin as never);
    if (outcomes.length > 0) {
      const to = await getAdminNotificationEmail();
      await sendEmail({
        to,
        subject: `PFA — Fiyat türetme raporu (${snapshot.tarih})`,
        html: derivationReportHtml(snapshot, outcomes),
      });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        tarih: snapshot.tarih,
        applied: outcomes.filter((o) => o.applied).length,
        suggested: outcomes.filter((o) => o.suggestion_only).length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    console.error("[fx-sync] türetme başarısız", msg);
    return new Response(JSON.stringify({ ok: false, error: "derivation_failed", message: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/fx-sync")({
  server: { handlers: { GET: ({ request }) => run(request), POST: ({ request }) => run(request) } },
});