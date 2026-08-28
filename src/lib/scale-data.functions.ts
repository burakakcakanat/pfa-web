import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ItemStat, LevelStat } from "@/lib/scale-stats";

export type DirectSessionRow = {
  id: string;
  created_at: string;
  completed_at: string | null;
  type: "mini" | "full";
  status: string;
  locale: string;
  instrument_version: number;
  full_name: string | null;
  email: string | null;
  level_scores: Record<string, number> | null;
  research_consent: boolean;
};

export type AnswerDetailRow = {
  level: number;
  sort_order: number;
  text_tr: string;
  reverse_coded: boolean;
  raw: number;
  coded: number;
};

export type AnonSessionRow = {
  research_id: string;
  instrument_version: number;
  session_type: string;
  month: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/** 7a — direct participants (no practitioner invite). Identity may be shown. */
export const listDirectAssessmentSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DirectSessionRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sessions, error } = await supabaseAdmin
      .from("assessment_sessions")
      .select("id, user_id, type, status, locale, instrument_version, created_at, completed_at, research_consent")
      .is("client_invite_id", null)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const rows = sessions ?? [];
    if (!rows.length) return [];

    const uids = Array.from(
      new Set(rows.map((s) => s.user_id).filter((u): u is string => !!u)),
    );
    const [profRes, resRes] = await Promise.all([
      uids.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", uids)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("assessment_results")
        .select("session_id, level_scores")
        .in(
          "session_id",
          rows.map((s) => s.id),
        ),
    ]);
    const profs = new Map(
      ((profRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map(
        (p) => [p.id, p],
      ),
    );
    const results = new Map(
      ((resRes.data ?? []) as Array<{ session_id: string; level_scores: any }>).map((r) => [
        r.session_id,
        r.level_scores,
      ]),
    );

    return rows.map((s) => ({
      id: s.id,
      created_at: s.created_at,
      completed_at: s.completed_at,
      type: s.type as "mini" | "full",
      status: s.status,
      locale: s.locale,
      instrument_version: s.instrument_version,
      full_name: s.user_id ? profs.get(s.user_id)?.full_name ?? null : null,
      email: s.user_id ? profs.get(s.user_id)?.email ?? null : null,
      level_scores: (results.get(s.id) ?? null) as Record<string, number> | null,
      research_consent: Boolean((s as any).research_consent),
    }));
  });

/** 7a detail — 35 items with raw and coded values, plus level scores and bands. */
export const getDirectAssessmentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { coded } = await import("@/lib/scale-stats");

    const { data: session, error: sErr } = await supabaseAdmin
      .from("assessment_sessions")
      .select("id, client_invite_id")
      .eq("id", data.session_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Oturum bulunamadı");
    if (session.client_invite_id) throw new Error("Bu oturum uygulayıcı danışanına ait.");

    const [ansRes, resRes] = await Promise.all([
      supabaseAdmin
        .from("assessment_answers")
        .select("value, reverse_coded, question_id, assessment_questions(level, sort_order, text_tr)")
        .eq("session_id", data.session_id),
      supabaseAdmin
        .from("assessment_results")
        .select("level_scores, intelligence_scores, summary_band")
        .eq("session_id", data.session_id)
        .maybeSingle(),
    ]);
    if (ansRes.error) throw new Error(ansRes.error.message);

    const answers: AnswerDetailRow[] = ((ansRes.data ?? []) as any[])
      .map((a) => ({
        level: a.assessment_questions?.level ?? 0,
        sort_order: a.assessment_questions?.sort_order ?? 0,
        text_tr: a.assessment_questions?.text_tr ?? "—",
        reverse_coded: Boolean(a.reverse_coded),
        raw: a.value as number,
        coded: coded(a.value as number, Boolean(a.reverse_coded)),
      }))
      .sort((x, y) => x.level - y.level || x.sort_order - y.sort_order);

    return {
      answers,
      level_scores: (resRes.data?.level_scores ?? null) as Record<string, number> | null,
      intelligence_scores: (resRes.data?.intelligence_scores ?? null) as Record<string, number> | null,
      summary_band: (resRes.data?.summary_band ?? null) as Record<string, string> | null,
    };
  });

/**
 * 7b — practitioner clients, anonymous and consent-only.
 * Uses the de-identified research view; no identity, invite or practitioner field
 * is ever selected here.
 */
export const getAnonItemStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: ItemStat[]; levels: LevelStat[]; sessions: number }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeItemStats } = await import("@/lib/scale-stats");

    const { data: ids, error: idErr } = await supabaseAdmin
      .from("assessment_sessions")
      .select("research_id")
      .not("client_invite_id", "is", null)
      .eq("research_consent", true);
    if (idErr) throw new Error(idErr.message);
    const allowed = new Set((ids ?? []).map((r) => r.research_id as string));
    if (!allowed.size) return { items: [], levels: [], sessions: 0 };

    const { data: rows, error } = await supabaseAdmin
      .from("research_pfa_responses")
      .select("research_id, question_id, item_code, level, item_text_tr, reverse_coded, value")
      .limit(50000);
    if (error) throw new Error(error.message);

    const filtered = (rows ?? []).filter((r) => allowed.has(String(r.research_id)));
    const stats = computeItemStats(
      filtered.map((r) => ({
        key: String(r.research_id),
        question_id: String(r.question_id),
        item_code: r.item_code ?? null,
        level: Number(r.level ?? 0),
        text: r.item_text_tr ?? "—",
        reverse_coded: Boolean(r.reverse_coded),
        value: Number(r.value ?? 0),
      })),
    );
    return { ...stats, sessions: new Set(filtered.map((r) => r.research_id)).size };
  });

/** 7b list — pseudonymous sessions, month-level dates only. */
export const listAnonSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnonSessionRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assessment_sessions")
      .select("research_id, instrument_version, type, started_at")
      .not("client_invite_id", "is", null)
      .eq("research_consent", true)
      .order("started_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({
      research_id: String(s.research_id),
      instrument_version: Number(s.instrument_version ?? 0),
      session_type: String(s.type),
      month: String(s.started_at ?? "").slice(0, 7),
    }));
  });

/** 7b detail — item-level responses for one pseudonymous session. */
export const getAnonSessionAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ research_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<AnswerDetailRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { coded } = await import("@/lib/scale-stats");

    // Only practitioner-client, consent-given sessions may be opened here.
    const { data: allowed, error: aErr } = await supabaseAdmin
      .from("assessment_sessions")
      .select("research_id")
      .eq("research_id", data.research_id)
      .not("client_invite_id", "is", null)
      .eq("research_consent", true)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!allowed) throw new Error("Bu oturum bu ekranda görüntülenemez.");

    const { data: rows, error } = await supabaseAdmin
      .from("research_pfa_responses")
      .select("item_code, level, item_text_tr, reverse_coded, value")
      .eq("research_id", data.research_id);
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .map((r, i) => ({
        level: Number(r.level ?? 0),
        sort_order: i,
        text_tr: r.item_text_tr ?? String(r.item_code ?? "—"),
        reverse_coded: Boolean(r.reverse_coded),
        raw: Number(r.value ?? 0),
        coded: coded(Number(r.value ?? 0), Boolean(r.reverse_coded)),
      }))
      .sort((x, y) => x.level - y.level || x.text_tr.localeCompare(y.text_tr));
  });
