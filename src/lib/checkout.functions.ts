import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveBundlePrice } from "@/lib/bundles";

function isLiveRow(row: { active: boolean | null; activate_at?: string | null }): boolean {
  if (!row.active) return false;
  if (!row.activate_at) return true;
  return new Date(row.activate_at).getTime() <= Date.now();
}

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        product_slug: z.string().min(1).optional(),
        bundle_slug: z.string().min(1).optional(),
        book_lang: z.enum(["tr", "en"]).optional(),
        origin: z.string().url(),
        gift: z
          .object({
            recipient_name: z.string().trim().min(2).max(120),
            recipient_email: z.string().trim().email().max(255),
            gift_note: z.string().trim().max(200).optional().nullable(),
          })
          .optional(),
      })
      .refine((d) => !!d.product_slug || !!d.bundle_slug, {
        message: "product_slug veya bundle_slug gerekli",
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Global purchase switch — while off, no checkout session and no order row.
    const { data: flag } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "payments_enabled")
      .maybeSingle();
    if ((flag?.value ?? "false") !== "true") {
      throw new Error("Online satın alma henüz açık değil.");
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      throw new Error("Stripe yapılandırılmamış. Proje ayarlarından STRIPE_SECRET_KEY ekleyin.");
    }
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ============ BUNDLE PATH ============
    if (data.bundle_slug) {
      const { data: bundle } = await supabase
        .from("bundles")
        .select(
          "id, slug, name_tr, book_key, includes_book, pricing_mode, locked_to_product_slug, discount_percent, price_override_cents, active, activate_at",
        )
        .eq("slug", data.bundle_slug)
        .maybeSingle();
      if (!bundle || !isLiveRow(bundle)) {
        throw new Error("Paket bulunamadı veya henüz satışa açık değil.");
      }

      const { data: items } = await supabase
        .from("bundle_items")
        .select("product_slug, quantity")
        .eq("bundle_id", bundle.id);
      const { data: allProducts } = await supabase
        .from("products")
        .select("slug, price_cents");
      const priceMap: Record<string, number> = {};
      for (const p of allProducts ?? []) priceMap[p.slug] = p.price_cents;

      const bookLang: "tr" | "en" =
        data.book_lang ?? (bundle.book_key === "hcd" ? "en" : "tr");
      const priceCents = resolveBundlePrice(
        {
          pricing_mode: bundle.pricing_mode as "locked_to_product" | "sum_minus_percent",
          locked_to_product_slug: bundle.locked_to_product_slug,
          discount_percent: bundle.discount_percent,
          price_override_cents: bundle.price_override_cents,
          includes_book: bundle.includes_book,
          book_key: bundle.book_key,
          items: (items ?? []).map((i) => ({
            product_slug: i.product_slug,
            quantity: i.quantity ?? 1,
          })),
        },
        priceMap,
        bookLang,
      );
      if (priceCents <= 0) throw new Error("Paket fiyatı hesaplanamadı.");

      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: null,
          bundle_slug: bundle.slug,
          amount_cents: priceCents,
          currency: "usd",
          status: "pending",
          metadata: { book_lang: bookLang } as never,
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
              currency: "usd",
              unit_amount: priceCents,
              product_data: { name: bundle.name_tr },
            },
          },
        ],
        success_url: `${data.origin}/hesabim?checkout=success`,
        cancel_url: `${data.origin}/hesabim?checkout=cancel`,
        metadata: {
          order_id: order.id,
          user_id: userId,
          bundle_slug: bundle.slug,
          book_lang: bookLang,
        },
      });
      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);
      return { url: session.url };
    }

    // ============ SINGLE PRODUCT PATH ============
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, slug, name_tr, price_cents, currency, active, type, activate_at")
      .eq("slug", data.product_slug!)
      .maybeSingle();
    if (prodErr || !product || !isLiveRow(product)) {
      throw new Error("Ürün bulunamadı veya henüz satışa açık değil.");
    }
    if (data.gift && product.type !== "ebook") {
      throw new Error("Hediye seçeneği yalnızca e-book ürünlerinde kullanılabilir.");
    }

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
