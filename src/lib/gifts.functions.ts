import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Alıcı-görünümlü hediye özeti (claim sayfasında).
export const getGiftByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(4).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: gift } = await supabaseAdmin
      .from("ebook_gifts")
      .select("id, product_slug, recipient_name, recipient_email, gift_note, status, buyer_user_id")
      .eq("claim_token", data.token)
      .maybeSingle();
    if (!gift) return null;
    const { data: prod } = await supabaseAdmin
      .from("products")
      .select("name_tr")
      .eq("slug", gift.product_slug)
      .maybeSingle();
    const { data: buyer } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", gift.buyer_user_id)
      .maybeSingle();
    return {
      product_slug: gift.product_slug,
      product_name: prod?.name_tr ?? gift.product_slug,
      recipient_name: gift.recipient_name,
      recipient_email: gift.recipient_email,
      gift_note: gift.gift_note,
      status: gift.status as "pending" | "claimed",
      buyer_name: buyer?.full_name ?? null,
    };
  });

// Giriş yapmış alıcı token'ı kullanır → ebook yetkisi alır.
export const claimGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(4).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: entId, error } = await (supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>;
    }).rpc("claim_ebook_gift", { _token: data.token });
    if (error) throw new Error(error.message);
    return { entitlement_id: entId };
  });

// Kullanıcının kendi hediyeleri (Satın Alımlarım ekranında durum ve claim link'i).
export const listMyGifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("ebook_gifts")
      .select("id, product_slug, recipient_name, recipient_email, status, claim_token, created_at, claimed_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });