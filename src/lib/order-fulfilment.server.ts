// Server-only: ödenmiş sipariş sonrası teslim hazırlığı + bildirim e-postaları.
// Stripe webhook ve admin test siparişi aynı yolu kullanır.

/**
 * Siparişteki e-book yetkileri için imzalı PDF'i üretir (yoksa).
 * Teslim e-postası ancak dosya gerçekten oluştuğunda gönderilir; böylece
 * alıcıya var olmayan bir dosyayı işaret eden "kitabınız hazır" e-postası
 * gitmez.
 */
export async function ensureOrderEbookArtefacts(
  orderId: string,
): Promise<{ total: number; ready: number; failed: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ents } = await supabaseAdmin
    .from("user_entitlements")
    .select("id, type, metadata, user_id")
    .eq("source_order_id", orderId);

  const ebooks = (ents ?? []).filter((e) => e.type === "ebook");
  const failed: string[] = [];
  let ready = 0;

  for (const e of ebooks) {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const slug = (meta.product_slug as string | undefined) ?? "pfa-ebook-tr";
    try {
      const { ensurePersonalizedPdf } = await import("@/lib/ebooks.functions");
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", e.user_id as string)
        .maybeSingle();
      const path = await ensurePersonalizedPdf({
        entitlementId: e.id as string,
        slug,
        existingPath: (meta.personalized_pdf_path as string | undefined) ?? null,
        fullName:
          (meta.recipient_name as string | undefined) || prof?.full_name || prof?.email || "",
        email: (meta.recipient_email as string | undefined) || prof?.email || "",
        giftNote: (meta.gift_note as string | undefined) ?? null,
        buyerName: null,
      });
      if (path) ready++;
      else failed.push(`${slug}: dosya üretilemedi`);
    } catch (err) {
      failed.push(`${slug}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  return { total: ebooks.length, ready, failed };
}

export async function sendOrderPaidEmails(
  orderId: string,
): Promise<{ buyer: boolean; admin: boolean; deferred?: string }> {
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

  // Teslim duyurusundan ÖNCE dosyaları hazırla.
  const artefacts = await ensureOrderEbookArtefacts(order.id);
  const artefactsBroken = artefacts.total > 0 && artefacts.ready < artefacts.total;

  let buyerSent = false;
  if (prof?.email && !artefactsBroken) {
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
    ${artefactsBroken ? `<p style="color:#a33"><strong>Teslim e-postası gönderilmedi:</strong> imzalı PDF üretilemedi (${esc(artefacts.failed.join("; "))}). Dosya üretildikten sonra e-posta yeniden tetiklenmelidir.</p>` : ""}
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

  return {
    buyer: buyerSent,
    admin: adminRes.ok,
    ...(artefactsBroken
      ? { deferred: `imzalı PDF hazır değil: ${artefacts.failed.join("; ")}` }
      : {}),
  };
}
