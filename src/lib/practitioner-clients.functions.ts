// Danışan profilleri + haftalık müsaitlik — uygulayıcının kendi kayıtları.
// RLS zaten satır sahibine kısıtlar; sunucu tarafında da sahiplik yazılır.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PractitionerClient = {
  id: string;
  full_name: string;
  birth_year: number | null;
  gender: string | null;
  occupation: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
};

export type AvailabilityRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  note: string | null;
};

const CLIENT_COLS = "id, full_name, birth_year, gender, occupation, city, notes, created_at";
const AVAIL_COLS = "id, weekday, start_time, end_time, note";

export const listMyClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PractitionerClient[]> => {
    const { data, error } = await context.supabase
      .from("practitioner_clients")
      .select(CLIENT_COLS)
      .eq("practitioner_user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PractitionerClient[];
  });

const clientSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2, { message: "Ad soyad en az 2 karakter olmalı." }).max(200),
  birth_year: z.number().int().min(1900).max(2100).nullable().optional(),
  gender: z.string().trim().max(40).optional().default(""),
  occupation: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(4000).optional().default(""),
});

export const saveMyClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clientSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      full_name: data.full_name,
      birth_year: data.birth_year ?? null,
      gender: data.gender || null,
      occupation: data.occupation || null,
      city: data.city || null,
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("practitioner_clients")
        .update(row)
        .eq("id", data.id)
        .eq("practitioner_user_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("practitioner_clients")
      .insert({ ...row, practitioner_user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id as string };
  });

export const deleteMyClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("practitioner_clients")
      .delete()
      .eq("id", data.id)
      .eq("practitioner_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailabilityRow[]> => {
    const { data, error } = await context.supabase
      .from("practitioner_availability")
      .select(AVAIL_COLS)
      .eq("user_id", context.userId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AvailabilityRow[];
  });

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, { message: "Saati SS:DD biçiminde yazın." });

export const addMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        start_time: hhmm,
        end_time: hhmm,
        note: z.string().trim().max(300).optional().default(""),
      })
      .refine((v) => v.end_time > v.start_time, {
        message: "Bitiş saati başlangıçtan sonra olmalı.",
        path: ["end_time"],
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("practitioner_availability").insert({
      user_id: context.userId,
      weekday: data.weekday,
      start_time: `${data.start_time}:00`,
      end_time: `${data.end_time}:00`,
      note: data.note || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("practitioner_availability")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
