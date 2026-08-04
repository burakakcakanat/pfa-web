// Server-only: ödenmiş sipariş sonrası bildirim e-postaları.
// Stripe webhook ve admin test siparişi aynı yolu kullanır.
export async function sendOrderPaidEmails(orderId: string): Promise<{ buyer: boolean; admin: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, amount_cents, currency, product_id, bundle_slug, metadata, is_test")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { buyer: false, admin: false };

  const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
  const { renderEmail, esc } = await import("@/lib/email/templates");

  let productName = order.bundle_slug ? `Paket: ${order.bundle_slug}` : "Ürün";
  let bundleIncludesBook = false;
  if (order.bundle_slug) {
    const { data: b } = await supabaseAdmin
      .from("bundles").select("name_tr, includes_book").eq("slug", order.bundle_slug).maybeSingle();
    if (b) { productName = b.name_tr; bundleIncludesBook = !!b.includes_book; }
  }
  if (order.product_id) {
    const { data: p } = await supabaseAdmin
      .from("products").select("name_tr").eq("id", order.product_id).maybeSingle();
    if (p) productName = p.name_tr;
  }
  const { data: prof } = await supabaseAdmin
    .from("profiles").select("email, full_name").eq("id", order.user_id).maybeSingle();

  const amount = (order.amount_cents / 100).toFixed(2) + " " + (order.currency || "usd").toUpperCase();
  const testPrefix = order.is_test ? "[TEST] " : "";
  let buyerSent = false;
  if (prof?.email) {
    const body = `
      <p>Merhaba ${esc(prof.full_name || "")},</p>
      <p>Siparişiniz onaylandı. Teşekkür ederiz.</p>
      ${order.is_test ? `<p style="color:#8a7a55"><strong>Bu bir test siparişidir.</strong></p>` : ""}
      <table style="width:100%;font-size:14px;margin-top:10px">
        <tr><td style="color:#6b6355;padding:4px 0;width:120px">Ürün</td><td>${esc(productName)}</td></tr>
        <tr><td style="color:#6b6355;padding:4px 0">Tutar</td><td>${esc(amount)}</td></tr>
      </table>
      ${bundleIncludesBook ? `<p style="margin-top:16px">Kitabınızın dijital nüshaları (adınıza imzalı PDF ve EPUB) hesabınıza tanımlandı; /hesabim sayfanızdan okuyabilir veya indirebilirsiniz.</p>` : ""}`;
    const res = await sendEmail({
      to: prof.email,
      subject: `${testPrefix}PFA — Siparişiniz onaylandı: ${productName}`,
      html: renderEmail({
        title: "Siparişiniz onaylandı",
        bodyHtml: body,
        ctaLabel: "Hesabıma git",
        ctaHref: "https://psychofunctionalanalysis.com/hesabim",
      }),
    });
    buyerSent = res.ok;
  }

  const adminTo = await getAdminNotificationEmail();
  const adminBody = `
    <p>${order.is_test ? "Test siparişi (gerçek ödeme yok)." : "Yeni ödenmiş sipariş."}</p>
    <table style="width:100%;font-size:14px;margin-top:10px">
      <tr><td style="color:#6b6355;padding:4px 0;width:140px">Alıcı</td><td>${esc((prof?.full_name || "") + " <" + (prof?.email || "") + ">")}</td></tr>
      <tr><td style="color:#6b6355;padding:4px 0">Ürün</td><td>${esc(productName)}</td></tr>
      <tr><td style="color:#6b6355;padding:4px 0">Tutar</td><td>${esc(amount)}</td></tr>
      <tr><td style="color:#6b6355;padding:4px 0">Sipariş No</td><td>${esc(order.id)}</td></tr>
    </table>`;
  const adminRes = await sendEmail({
    to: adminTo,
    subject: `${testPrefix}PFA — Yeni sipariş: ${productName}`,
    html: renderEmail({ title: order.is_test ? "Test siparişi" : "Yeni ödenmiş sipariş", bodyHtml: adminBody }),
  });

  return { buyer: buyerSent, admin: adminRes.ok };
}
