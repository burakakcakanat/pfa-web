import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DemographicsSchema } from "./research-consent";

/** Consent state + optional demographics for the signed-in respondent. */
export const getMyResearchProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: consentRows }, { data: demo }] = await Promise.all([
      supabase.rpc("my_research_consent"),
      supabase.from("respondent_demographics").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const row = Array.isArray(consentRows) ? consentRows[0] : consentRows;

    return {
      consented: Boolean(row?.consented),
      consented_at: (row?.consented_at ?? null) as string | null,
      consent_version: (row?.consent_version ?? null) as string | null,
      session_count: Number(row?.session_count ?? 0),
      demographics: demo
        ? {
            age_band: demo.age_band,
            gender: demo.gender,
            education: demo.education,
            occupation_field: demo.occupation_field,
          }
        : null,
    };
  });

export const saveMyDemographics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DemographicsSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("respondent_demographics").upsert(
      {
        user_id: context.userId,
        age_band: data.age_band ?? null,
        gender: data.gender ?? null,
        education: data.education ?? null,
        occupation_field: data.occupation_field ?? null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Bilgiler kaydedilemedi.");
    return { ok: true };
  });

export const deleteMyDemographics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("respondent_demographics")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error("Bilgiler silinemedi.");
    return { ok: true };
  });

/**
 * Withdraw research consent. Flips consent off on every session belonging to the
 * caller and stamps the withdrawal time, which removes their rows from the
 * de-identified research views immediately. Personal reports are untouched.
 */
export const withdrawResearchConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("withdraw_research_consent");
    if (error) throw new Error("Onam geri çekilemedi.");
    return { withdrawn_sessions: Number(data ?? 0) };
  });

/** Re-grant consent for the caller's existing sessions (used from Hesabım). */
export const grantResearchConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ consent_version: z.string().max(40) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = {
      research_consent: true,
      research_consent_at: new Date().toISOString(),
      research_consent_version: data.consent_version,
      research_consent_withdrawn_at: null,
    };
    const [a, s] = await Promise.all([
      supabase.from("assessment_sessions").update(patch).eq("user_id", userId).select("id"),
      supabase.from("sevenq_sessions").update(patch).eq("user_id", userId).select("id"),
    ]);
    if (a.error || s.error) throw new Error("Onam kaydedilemedi.");
    return { sessions: (a.data?.length ?? 0) + (s.data?.length ?? 0) };
  });