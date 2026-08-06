import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeScores } from "./assessment-scoring";
import { ResearchConsentSchema } from "./research-consent";

const AnswerSchema = z.object({
  question_id: z.string().uuid(),
  value: z.number().int().min(1).max(5),
});

export const saveAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        type: z.enum(["mini", "full"]),
        answers: z.array(AnswerSchema).min(1).max(500),
        consent: ResearchConsentSchema.nullish(),
        locale: z.enum(["tr", "en"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.type === "full") {
      const { data: ent } = await supabase
        .from("user_entitlements")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "assessment_full")
        .limit(1);
      if (!ent || ent.length === 0) {
        throw new Error("Tam değerlendirme için yetkiniz bulunamadı.");
      }
    }

    const ids = data.answers.map((a) => a.question_id);
    const { data: questions, error: qErr } = await supabase
      .from("assessment_questions")
      .select("id, level, reverse_coded, active")
      .in("id", ids);
    if (qErr || !questions) throw new Error("Sorular yüklenemedi.");

    const active = questions.filter((q) => q.active);
    if (active.length !== ids.length) {
      throw new Error("Bazı sorular artık aktif değil. Lütfen testi yeniden başlatın.");
    }

    const scores = computeScores(
      data.answers,
      active.map((q) => ({ id: q.id, level: q.level, reverse_coded: q.reverse_coded })),
    );

    const { data: versionData } = await supabase.rpc("current_instrument_version", {
      _instrument: "pfa",
    });
    const instrumentVersion = Number(versionData ?? 1);

    const consent = data.consent ?? null;
    const consented = Boolean(consent?.research_consent);
    const { resolveLocale } = await import("@/lib/locale.server");
    const locale = resolveLocale(data.locale);

    const { data: session, error: sErr } = await supabase
      .from("assessment_sessions")
      .insert({
        user_id: userId,
        type: data.type,
        status: "completed",
        completed_at: new Date().toISOString(),
        instrument_version: instrumentVersion,
        locale,
        research_consent: consented,
        research_consent_at: consented ? new Date().toISOString() : null,
        research_consent_version: consented ? (consent?.consent_version ?? null) : null,
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error("Oturum oluşturulamadı.");

    const reverseById = new Map(active.map((q) => [q.id, q.reverse_coded]));
    const { error: aErr } = await supabase.from("assessment_answers").insert(
      data.answers.map((a) => ({
        session_id: session.id,
        question_id: a.question_id,
        value: a.value,
        reverse_coded: reverseById.get(a.question_id) ?? false,
      })),
    );
    if (aErr) throw new Error("Cevaplar kaydedilemedi.");

    const { error: rErr } = await supabase.from("assessment_results").insert({
      session_id: session.id,
      level_scores: scores.level_scores,
      intelligence_scores: scores.intelligence_scores,
      summary_band: scores.summary_band,
    });
    if (rErr) throw new Error("Sonuç kaydedilemedi.");

    if (consented && consent?.demographics) {
      const d = consent.demographics;
      if (d.age_band || d.gender || d.education || d.occupation_field) {
        await supabase.from("respondent_demographics").upsert(
          {
            user_id: userId,
            age_band: d.age_band ?? null,
            gender: d.gender ?? null,
            education: d.education ?? null,
            occupation_field: d.occupation_field ?? null,
          },
          { onConflict: "user_id" },
        );
      }
    }

    return { session_id: session.id };
  });