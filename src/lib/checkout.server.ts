// Sağlayıcıdan bağımsız sipariş kurulumu.
// Fiyat her zaman sunucuda product_prices üzerinden yeniden hesaplanır;
// istemciden gelen tutara asla güvenilmez.
//
// Teslimat zinciri: handle_order_paid (tekil sipariş) / handle_bundle_paid
// (bundle_slug dolu sipariş). Bu dosya yalnızca doğru sipariş satırını üretir.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PAYMENTS_LIVE, type PaymentProvider } from "@/lib/payments-config";
import {
  applyDiscount,
  matchBundleForSelection,
  priceFor,
  type Currency,
  type CurrencyPriceMap,
} from "@/lib/pricing";
import { createProviderCheckout } from "@/lib/payment-provider.server";

type AnyClient = SupabaseClient<any, any, any>;

export type StartCheckoutInput = {
  product_slug: string;
  addon_slugs?: string[];
  currency: Currency;
  origin: string;
  discount_code?: string | null;
  gift?: {
    recipient_name: string;
    recipient_email: string;
    gift_note?: string | null;
  } | null;
};

function isLiveRow(row: { active: boolean | null; activate_at?: string | null }): boolean {
  if (!row.active) return false;
  if (!row.activate_at) return true;
  return new Date(row.activate_at).getTime() <= Date.now();
}

async function loadPrices(sb: AnyClient, slugs: string[]): Promise<CurrencyPriceMap> {
  const { data: products } = await sb
    .from("products")
    .select("id, slug, active, activate_at, type, book_key, name_tr")
    .in("slug", slugs);
  const ids = (products ?? []).map((p: any) => p.id);
  const { data: prices } = await sb
    .from("product_prices")
    .select("product_id, currency, price_cents, active")
    .in("product_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const bySlug: CurrencyPriceMap = {};
  const idToSlug = new Map<string, string>((products ?? []).map((p: any) => [p.id, p.slug]));
  for (const r of prices ?? []) {
    if (!r.active) continue;
    const slug = idToSlug.get(r.product_id);
    if (!slug) continue;
    bySlug[slug] = { ...(bySlug[slug] ?? {}), [r.currency as Currency]: r.price_cents };
  }
  return bySlug;
}

export async function startCheckoutOnServer(
  input: StartCheckoutInput,
  ctx: { supabase: AnyClient; userId: string },
): Promise<{ url: string | null; order_id: string; amount_cents: number; currency: Currency }> {
  const { supabase, userId } = ctx;

  const { data: product } = await supabase
    .from("products")
    .select("id, slug, name_tr, type, book_key, active, activate_at")
    .eq("slug", input.product_slug)
    .maybeSingle();
  if (!product || !isLiveRow(product)) {
    throw new Error("Ürün bulunamadı veya henüz satışa açık değil.");
  }

  const isGift = !!input.gift;
  if (isGift && product.type !== "ebook") {
    throw new Error("Hediye seçeneği yalnızca e-kitaplarda kullanılabilir.");
  }

  // Hediye modunda ek ürün OLAMAZ: handle_bundle_paid hediyeyi desteklemiyor.
  const addonSlugs = isGift ? [] : [...new Set(input.addon_slugs ?? [])];

  const slugs = [product.slug, ...addonSlugs];
  const prices = await loadPrices(supabase, slugs);

  let currency: Currency = input.currency;
  for (const s of slugs) {
    const p = priceFor(prices, s, currency);
    if (!p) throw new Error("Bu ürün için fiyat tanımlı değil.");
    // İstenen para biriminde eksik fiyat varsa tüm sepet USD'ye düşer.
    if (p.currency !== currency) currency = "usd";
  }

  let subtotal = 0;
  const lineItems: Array<{ slug: string; cents: number }> = [];
  for (const s of slugs) {
    const p = priceFor(prices, s, currency);
    if (!p) throw new Error("Bu ürün için fiyat tanımlı değil.");
    subtotal += p.cents;
    lineItems.push({ slug: s, cents: p.cents });
  }

  // Paket eşleştirme — indirim yalnızca discount_percent üzerinden.
  let bundleSlug: string | null = null;
  let discountCents = 0;
  if (addonSlugs.length > 0 && product.book_key) {
    const { data: bundles } = await supabase
      .from("bundles")
      .select("slug, name_tr, book_key, includes_book, discount_percent, active, activate_at");
    const { data: bItems } = await supabase.from("bundle_items").select("bundle_id, product_slug, quantity");
    const { data: bIds } = await supabase.from("bundles").select("id, slug");
    const idBySlug = new Map<string, string>((bIds ?? []).map((b: any) => [b.slug, b.id]));
    const itemsBySlug = new Map<string, Array<{ product_slug: string; quantity: number }>>();
    for (const b of bundles ?? []) {
      const id = idBySlug.get(b.slug);
      itemsBySlug.set(
        b.slug,
        (bItems ?? [])
          .filter((i: any) => i.bundle_id === id)
          .map((i: any) => ({ product_slug: i.product_slug, quantity: i.quantity ?? 1 })),
      );
    }
    const shaped = (bundles ?? []).map((b: any) => ({ ...b, items: itemsBySlug.get(b.slug) ?? [] }));
    const match = matchBundleForSelection(shaped as any, product.book_key, addonSlugs);
    if (match) {
      bundleSlug = match.slug;
      discountCents = applyDiscount(subtotal, match.discount_percent);
    }
  }

  const total = Math.max(0, subtotal - discountCents);

  const bookLang: "tr" | "en" = product.slug.endsWith("-en") ? "en" : "tr";
  const metadata: Record<string, unknown> = {
    product_slug: product.slug,
    addon_slugs: addonSlugs,
    subtotal_cents: subtotal,
    discount_cents: discountCents,
    discount_code: input.discount_code?.trim() || null,
    book_lang: bookLang,
    is_gift: isGift,
  };
  if (isGift && input.gift) {
    metadata.recipient_name = input.gift.recipient_name;
    metadata.recipient_email = input.gift.recipient_email.toLowerCase();
    metadata.gift_note = input.gift.gift_note ?? null;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      product_id: bundleSlug ? null : product.id,
      bundle_slug: bundleSlug,
      amount_cents: total,
      currency,
      status: "pending",
      metadata: metadata as never,
    })
    .select("id")
    .single();
  if (orderErr || !order) throw new Error("Sipariş oluşturulamadı.");

  if (!PAYMENTS_LIVE) {
    // Kod hazır; sağlayıcı rayı kapalı olduğu için hiçbir yere gitmiyoruz.
    throw new Error("Kartlı ödeme henüz açık değil. Çok yakında.");
  }

  const provider: PaymentProvider = currency === "try" ? "paytr" : "lemonsqueezy";
  const res = await createProviderCheckout(
    {
      order_id: order.id,
      amount_cents: total,
      currency,
      description: bundleSlug ?? product.name_tr,
      origin: input.origin,
      customer_email: null,
    },
    provider,
  );
  await supabaseAdmin
    .from("orders")
    .update({ provider, provider_ref: res.provider_ref })
    .eq("id", order.id);

  return { url: res.url, order_id: order.id, amount_cents: total, currency };
}
