import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeScores } from "./assessment-scoring";

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

    const { data: session, error: sErr } = await supabase
      .from("assessment_sessions")
      .insert({
        user_id: userId,
        type: data.type,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error("Oturum oluşturulamadı.");

    const { error: aErr } = await supabase.from("assessment_answers").insert(
      data.answers.map((a) => ({
        session_id: session.id,
        question_id: a.question_id,
        value: a.value,
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

    return { session_id: session.id };
  });