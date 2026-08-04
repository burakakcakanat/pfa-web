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
                const { sendOrderPaidEmails } = await import("@/lib/order-fulfilment.server");
                await sendOrderPaidEmails(updated.id);
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