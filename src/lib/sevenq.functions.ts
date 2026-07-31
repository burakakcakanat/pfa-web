import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeSevenqScores, type CapacityCode } from "./sevenq-scoring";

async function readAccess(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<{ pilotOpen: boolean; entitled: boolean; allowed: boolean }> {
  const [{ data: setting }, { data: ent }] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "sevenq_pilot_open").maybeSingle(),
    supabase.from("user_entitlements").select("id").eq("user_id", userId).eq("type", "sevenq").limit(1),
  ]);
  const pilotOpen = (setting?.value ?? "true") !== "false";
  const entitled = Array.isArray(ent) && ent.length > 0;
  return { pilotOpen, entitled, allowed: pilotOpen || entitled };
}

export const getSevenqAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readAccess(context.supabase as never, context.userId));

export const startSevenqSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ invite: z.string().min(4).max(200).nullish() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const access = await readAccess(supabase as never, userId);
    if (!access.allowed) throw new Error("7Q Profili için erişim yetkiniz bulunamadı.");

    let clientInviteId: string | null = null;
    if (data.invite) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inv } = await supabaseAdmin
        .from("pro_client_invites")
        .select("id")
        .eq("token", data.invite)
        .maybeSingle();
      clientInviteId = inv?.id ?? null;
    }

    const existingQuery = supabase
      .from("sevenq_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1);
    const { data: existing } = await (clientInviteId
      ? existingQuery.eq("client_invite_id", clientInviteId)
      : existingQuery.is("client_invite_id", null));

    let sessionId = existing?.[0]?.id ?? null;

    if (!sessionId) {
      const { data: created, error } = await supabase
        .from("sevenq_sessions")
        .insert({ user_id: userId, client_invite_id: clientInviteId, status: "in_progress" })
        .select("id")
        .single();
      if (error || !created) throw new Error("7Q oturumu başlatılamadı.");
      sessionId = created.id;
    }

    const { data: answers } = await supabase
      .from("sevenq_answers")
      .select("question_id, value")
      .eq("session_id", sessionId);

    return { session_id: sessionId as string, answers: answers ?? [] };
  });

export const saveSevenqAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        session_id: z.string().uuid(),
        question_id: z.string().uuid(),
        value: z.number().int().min(1).max(5),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sevenq_answers")
      .upsert(
        { session_id: data.session_id, question_id: data.question_id, value: data.value },
        { onConflict: "session_id,question_id" },
      );
    if (error) throw new Error("Cevap kaydedilemedi.");
    return { ok: true };
  });

export const completeSevenqSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ session_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: session } = await supabase
      .from("sevenq_sessions")
      .select("id, user_id, client_invite_id")
      .eq("id", data.session_id)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Oturum bulunamadı.");

    const [{ data: answers }, { data: questions }] = await Promise.all([
      supabase.from("sevenq_answers").select("question_id, value").eq("session_id", session.id),
      supabase.from("sevenq_questions").select("id, level, capacity, awareness_item").eq("active", true),
    ]);
    if (!answers?.length || !questions?.length) throw new Error("Cevaplar bulunamadı.");

    const scores = computeSevenqScores(
      answers as { question_id: string; value: number }[],
      (questions as { id: string; level: number; capacity: string; awareness_item: boolean }[]).map((q) => ({
        id: q.id,
        level: q.level,
        capacity: q.capacity as CapacityCode,
        awareness_item: q.awareness_item,
      })),
    );

    const { error: rErr } = await supabase.from("sevenq_results").upsert(
      {
        session_id: session.id,
        level_scores: scores.level_scores,
        capacity_scores: scores.capacity_scores,
        total_score: scores.total_score,
        akort: scores.akort,
        awareness_score: scores.awareness_score,
      },
      { onConflict: "session_id" },
    );
    if (rErr) throw new Error("Sonuç kaydedilemedi.");

    const { error: sErr } = await supabase
      .from("sevenq_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id);
    if (sErr) throw new Error("Oturum tamamlanamadı.");

    if (session.client_invite_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("pro_client_invites")
        .update({ status: "completed" })
        .eq("id", session.client_invite_id);
    }

    return { session_id: session.id };
  });
