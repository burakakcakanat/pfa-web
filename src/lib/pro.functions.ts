import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: ent } = await supabase
      .from("user_entitlements")
      .select("id, metadata, created_at")
      .eq("user_id", userId)
      .eq("type", "pfa_pro")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const meta = (ent?.metadata ?? {}) as {
      client_quota?: number;
      client_used?: number;
      tier?: "practitioner" | "fellow";
      referral_code?: string;
    };
    const quota = meta.client_quota ?? 0;
    const used = meta.client_used ?? 0;

    // Ek paket fiyatı katalogdan okunur (hardcoded fiyat yok).
    let clientPackPriceCents: number | null = null;
    let clientPackCurrency = "usd";
    const { data: pack } = await supabase
      .from("products")
      .select("id, price_cents, currency")
      .eq("slug", "client-pack-10")
      .maybeSingle();
    if (pack) {
      const { data: price } = await supabase
        .from("product_prices")
        .select("price_cents, currency")
        .eq("product_id", pack.id)
        .eq("active", true)
        .order("currency", { ascending: true })
        .limit(1)
        .maybeSingle();
      clientPackPriceCents = price?.price_cents ?? pack.price_cents ?? null;
      clientPackCurrency = price?.currency ?? pack.currency ?? "usd";
    }

    const { data: invites } = await supabase
      .from("pro_client_invites")
      .select("id, client_name, token, status, created_at, mode")
      .order("created_at", { ascending: false });

    // Her tamamlanmış davet için ilgili tamamlanmış ölçek oturumunu eşle.
    // RLS: uygulayıcı yalnızca kendi davetlerine bağlı oturumları görebilir.
    const inviteIds = (invites ?? []).map((i) => i.id);
    const sessionByInvite: Record<string, string> = {};
    const sevenqByInvite: Record<string, string> = {};
    if (inviteIds.length > 0) {
      const { data: sessions } = await supabase
        .from("assessment_sessions")
        .select("id, client_invite_id, completed_at")
        .in("client_invite_id", inviteIds)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      for (const s of sessions ?? []) {
        if (s.client_invite_id && !sessionByInvite[s.client_invite_id]) {
          sessionByInvite[s.client_invite_id] = s.id;
        }
      }

      // 7Q oturumları: aynı davet, ayrı ölçüm hattı.
      const { data: sevenq } = await supabase
        .from("sevenq_sessions")
        .select("id, client_invite_id, completed_at")
        .in("client_invite_id", inviteIds)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      for (const s of sevenq ?? []) {
        if (s.client_invite_id && !sevenqByInvite[s.client_invite_id]) {
          sevenqByInvite[s.client_invite_id] = s.id;
        }
      }
    }

    return {
      hasPro: !!ent,
      tier: meta.tier ?? "practitioner",
      referralCode: meta.referral_code ?? null,
      quota,
      used,
      remaining: Math.max(0, quota - used),
      clientPackPriceCents,
      clientPackCurrency,
      invites: (invites ?? []).map((i) => ({
        ...i,
        session_id: sessionByInvite[i.id] ?? null,
        sevenq_session_id: sevenqByInvite[i.id] ?? null,
      })),
    };
  });

export const createProInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ client_name: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: invite, error } = await (supabase as any).rpc("create_pro_invite", {
      _client_name: data.client_name,
    });
    if (error) {
      if (error.message.includes("QUOTA_EXHAUSTED")) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      throw new Error(error.message);
    }
    return invite;
  });
