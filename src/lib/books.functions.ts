import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function makePublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type BooksPayload = {
  products: Array<{
    slug: string;
    name_tr: string;
    price_cents: number;
    currency: string;
    active: boolean;
    activate_at: string | null;
    book_key: string | null;
    language: string;
    cover_image_url: string | null;
  }>;
  editions: Array<{
    id: string;
    book_key: string;
    format: "kindle" | "paperback" | "google_play";
    language: "tr" | "en";
    asin: string | null;
    external_url: string | null;
    marketplaces: string[];
    overrides: Record<string, string>;
    active: boolean;
    sort_order: number;
  }>;
  bundles: Array<{
    id: string;
    slug: string;
    name_tr: string;
    description_tr: string | null;
    book_key: string;
    includes_book: boolean;
    pricing_mode: "locked_to_product" | "sum_minus_percent";
    locked_to_product_slug: string | null;
    discount_percent: number;
    price_override_cents: number | null;
    active: boolean;
    activate_at: string | null;
    sort_order: number;
    items: Array<{ product_slug: string; quantity: number }>;
  }>;
};

export const getBooksData = createServerFn({ method: "GET" }).handler(async (): Promise<BooksPayload> => {
  const sb = makePublicClient();
  const nowIso = new Date().toISOString();

  const [prodRes, edRes, bundleRes, bundleItemsRes] = await Promise.all([
    sb.from("products").select("slug, name_tr, price_cents, currency, active, activate_at, book_key, language, cover_image_url"),
    sb.from("book_editions").select("id, book_key, format, language, asin, external_url, marketplaces, overrides, active, sort_order").order("sort_order"),
    sb.from("bundles").select("id, slug, name_tr, description_tr, book_key, includes_book, pricing_mode, locked_to_product_slug, discount_percent, price_override_cents, active, activate_at, sort_order").order("sort_order"),
    sb.from("bundle_items").select("bundle_id, product_slug, quantity"),
  ]);

  const itemsByBundle = new Map<string, Array<{ product_slug: string; quantity: number }>>();
  for (const it of bundleItemsRes.data ?? []) {
    const arr = itemsByBundle.get(it.bundle_id) ?? [];
    arr.push({ product_slug: it.product_slug, quantity: it.quantity ?? 1 });
    itemsByBundle.set(it.bundle_id, arr);
  }

  return {
    products: (prodRes.data ?? []).map((p) => ({ ...p, activate_at: p.activate_at ?? null })),
    editions: (edRes.data ?? []).map((e) => ({
      ...e,
      format: e.format as "kindle" | "paperback" | "google_play",
      language: ((e as { language?: string }).language === "tr" ? "tr" : "en") as "tr" | "en",
      overrides: (e.overrides ?? {}) as Record<string, string>,
      marketplaces: e.marketplaces ?? [],
    })),
    bundles: (bundleRes.data ?? []).map((b) => ({
      ...b,
      pricing_mode: b.pricing_mode as "locked_to_product" | "sum_minus_percent",
      items: itemsByBundle.get(b.id) ?? [],
    })),
  };
});