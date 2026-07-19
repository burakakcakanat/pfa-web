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

    const meta = (ent?.metadata ?? {}) as { client_quota?: number; client_used?: number };
    const quota = meta.client_quota ?? 0;
    const used = meta.client_used ?? 0;

    const { data: invites } = await supabase
      .from("pro_client_invites")
      .select("id, client_name, token, status, created_at")
      .order("created_at", { ascending: false });

    return {
      hasPro: !!ent,
      quota,
      used,
      remaining: Math.max(0, quota - used),
      invites: invites ?? [],
    };
  });

export const createProInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ client_name: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: invite, error } = await supabase.rpc("create_pro_invite", {
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
