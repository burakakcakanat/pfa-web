import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AdminSessionRequestRow,
  MySessionsView,
  SessionRequestRow,
} from "@/lib/session-requests";

const ROW_COLS =
  "id, status, preferred_slot, confirmed_at, admin_note, created_at, practitioner_id";

/** A session credit = one user_entitlements row of type 'session'. */
export const getMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySessionsView> => {
    const { supabase, userId } = context;
    const [{ data: ents }, { data: reqs }] = await Promise.all([
      supabase.from("user_entitlements").select("id").eq("type", "session").eq("user_id", userId),
      supabase
        .from("session_requests")
        .select(ROW_COLS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    const requests = (reqs ?? []) as unknown as SessionRequestRow[];
    const total = (ents ?? []).length;
    const used = requests.filter((r) => r.status !== "cancelled").length;
    return {
      credits_total: total,
      credits_used: used,
      credits_remaining: Math.max(0, total - used),
      requests,
    };
  });

/**
 * Spend one credit on a preferred time. This is a PREFERENCE only — the admin
 * confirms, which flips the status and sends the confirmation e-mail.
 */
export const requestSessionTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        preferred_slot: z
          .string()
          .trim()
          .min(1, { message: "Tercih ettiğiniz zamanı seçin." })
          .max(400),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ data: ents }, { data: reqs }] = await Promise.all([
      supabase.from("user_entitlements").select("id").eq("type", "session").eq("user_id", userId),
      supabase
        .from("session_requests")
        .select("id, entitlement_id, status")
        .eq("user_id", userId),
    ]);
    const active = (reqs ?? []).filter(
      (r) => (r as { status: string }).status !== "cancelled",
    );
    const usedIds = new Set(
      active.map((r) => (r as { entitlement_id: string | null }).entitlement_id).filter(Boolean),
    );
    const free = (ents ?? []).find((e) => !usedIds.has(e.id as string));
    if (!free || active.length >= (ents ?? []).length) {
      throw new Error("Kullanılabilir seans krediniz yok.");
    }
    const { error } = await supabase.from("session_requests").insert({
      user_id: userId,
      entitlement_id: free.id as string,
      preferred_slot: data.preferred_slot,
      status: "pending",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListSessionRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSessionRequestRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { listAdminSessionRequests } = await import("@/lib/session-requests.server");
    return listAdminSessionRequests();
  });

export const adminUpdateSessionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
        confirmed_slot: z.string().trim().max(400).optional(),
        admin_note: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { updateAdminSessionRequest } = await import("@/lib/session-requests.server");
    return updateAdminSessionRequest(data);
  });
