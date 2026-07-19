import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        product_slug: z.string().min(1),
        origin: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, slug, name_tr, price_cents, currency, active")
      .eq("slug", data.product_slug)
      .maybeSingle();
    if (prodErr || !product || !product.active) {
      throw new Error("Ürün bulunamadı.");
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      throw new Error(
        "Stripe yapılandırılmamış. Proje ayarlarından STRIPE_SECRET_KEY ekleyin.",
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        product_id: product.id,
        amount_cents: product.price_cents,
        currency: product.currency,
        status: "pending",
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Sipariş oluşturulamadı.");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.price_cents,
            product_data: { name: product.name_tr },
          },
        },
      ],
      success_url: `${data.origin}/hesabim?checkout=success`,
      cancel_url: `${data.origin}/hesabim?checkout=cancel`,
      metadata: { order_id: order.id, user_id: userId, product_slug: product.slug },
    });

    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return { url: session.url };
  });