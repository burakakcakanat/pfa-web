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
        gift: z
          .object({
            recipient_name: z.string().trim().min(2).max(120),
            recipient_email: z.string().trim().email().max(255),
            gift_note: z.string().trim().max(200).optional().nullable(),
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, slug, name_tr, price_cents, currency, active, type")
      .eq("slug", data.product_slug)
      .maybeSingle();
    if (prodErr || !product || !product.active) {
      throw new Error("Ürün bulunamadı.");
    }

    if (data.gift && product.type !== "ebook") {
      throw new Error("Hediye seçeneği yalnızca e-book ürünlerinde kullanılabilir.");
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

    const orderMetadata = data.gift
      ? {
          is_gift: true,
          recipient_name: data.gift.recipient_name,
          recipient_email: data.gift.recipient_email.toLowerCase(),
          gift_note: data.gift.gift_note ?? null,
        }
      : { is_gift: false };

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        product_id: product.id,
        amount_cents: product.price_cents,
        currency: product.currency,
        status: "pending",
        metadata: orderMetadata as never,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Sipariş oluşturulamadı.");

    const productName = data.gift
      ? `${product.name_tr} — Hediye (${data.gift.recipient_name})`
      : `${product.name_tr} — İsme İmzalı Nüsha`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.price_cents,
            product_data: { name: productName },
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