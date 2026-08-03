import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeSecret = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!stripeSecret || !webhookSecret) {
          return new Response("Stripe not configured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const rawBody = await request.text();
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeSecret);

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "invalid";
          return new Response(`Webhook error: ${msg}`, { status: 400 });
        }

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object as { id: string; metadata?: Record<string, string> | null };
          const orderId = session.metadata?.order_id;
          if (orderId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: updated } = await supabaseAdmin
              .from("orders")
              .update({ status: "paid" })
              .eq("id", orderId)
              .eq("status", "pending")
              .select("id, user_id, amount_cents, currency, product_id, bundle_slug, metadata")
              .maybeSingle();
            if (updated) {
              try {
                const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
                const { renderEmail, esc } = await import("@/lib/email/templates");
                let productName = updated.bundle_slug ? `Paket: ${updated.bundle_slug}` : "Ürün";
                let productType: string | null = null;
                let bundleIncludesBook = false;
                if (updated.bundle_slug) {
                  const { data: b } = await supabaseAdmin
                    .from("bundles").select("name_tr, includes_book").eq("slug", updated.bundle_slug).maybeSingle();
                  if (b) { productName = b.name_tr; bundleIncludesBook = !!b.includes_book; }
                }
                if (updated.product_id) {
                  const { data: p } = await supabaseAdmin
                    .from("products").select("name_tr, type").eq("id", updated.product_id).maybeSingle();
                  if (p) { productName = p.name_tr; productType = p.type as string; }
                }
                const { data: prof } = await supabaseAdmin
                  .from("profiles").select("email, full_name").eq("id", updated.user_id).maybeSingle();
                const amount = (updated.amount_cents / 100).toFixed(2) + " " + (updated.currency || "usd").toUpperCase();
                const isDigital = productType === "ebook" || productType === "assessment" || !!updated.bundle_slug;
                // Buyer confirmation
                if (prof?.email) {
                  const body = `
                    <p>Merhaba ${esc(prof.full_name || "")},</p>
                    <p>Siparişiniz onaylandı. Teşekkür ederiz.</p>
                    <table style="width:100%;font-size:14px;margin-top:10px">
                      <tr><td style="color:#6b6355;padding:4px 0;width:120px">Ürün</td><td>${esc(productName)}</td></tr>
                      <tr><td style="color:#6b6355;padding:4px 0">Tutar</td><td>${esc(amount)}</td></tr>
                    </table>
                    ${bundleIncludesBook ? `<p style="margin-top:16px">Kitabınızın dijital nüshaları (adınıza imzalı PDF ve EPUB) hesabınıza tanımlandı; /hesabim sayfanızdan okuyabilir veya indirebilirsiniz.</p>` : ""}`;
                  await sendEmail({
                    to: prof.email,
                    subject: `PFA — Siparişiniz onaylandı: ${productName}`,
                    html: renderEmail({
                      title: "Siparişiniz onaylandı",
                      bodyHtml: body,
                      ctaLabel: isDigital ? "Hesabıma git" : undefined,
                      ctaHref: isDigital ? "https://psychofunctionalanalysis.com/hesabim" : undefined,
                    }),
                  });
                }
                // Admin notification
                const adminTo = await getAdminNotificationEmail();
                const adminBody = `
                  <p>Yeni ödenmiş sipariş.</p>
                  <table style="width:100%;font-size:14px;margin-top:10px">
                    <tr><td style="color:#6b6355;padding:4px 0;width:140px">Alıcı</td><td>${esc((prof?.full_name || "") + " <" + (prof?.email || "") + ">")}</td></tr>
                    <tr><td style="color:#6b6355;padding:4px 0">Ürün</td><td>${esc(productName)}</td></tr>
                    <tr><td style="color:#6b6355;padding:4px 0">Tutar</td><td>${esc(amount)}</td></tr>
                    <tr><td style="color:#6b6355;padding:4px 0">Sipariş No</td><td>${esc(updated.id)}</td></tr>
                  </table>`;
                await sendEmail({
                  to: adminTo,
                  subject: `PFA — Yeni sipariş: ${productName}`,
                  html: renderEmail({ title: "Yeni ödenmiş sipariş", bodyHtml: adminBody }),
                });
              } catch (e) {
                console.error("[email] order paid notify failed", e);
              }
            }
          }
        } else if (
          event.type === "checkout.session.async_payment_failed" ||
          event.type === "checkout.session.expired"
        ) {
          const session = event.data.object as { id: string; metadata?: Record<string, string> | null };
          const orderId = session.metadata?.order_id;
          if (orderId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("orders")
              .update({ status: "failed" })
              .eq("id", orderId);
          }
        }

        return new Response("ok");
      },
    },
  },
});