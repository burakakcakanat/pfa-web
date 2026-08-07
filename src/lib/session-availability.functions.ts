import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SessionSlot } from "@/lib/session-availability";

const COLS = "id, practitioner_id, weekday, slot_time, active, sort_order, note";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public: only the slots the admin has switched on. */
export const listSessionAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const supa = publicClient();
  const { data, error } = await supa
    .from("session_availability")
    .select(COLS)
    .eq("active", true)
    .order("weekday", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("slot_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SessionSlot[];
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/** Admin: every slot, including the switched-off ones. */
export const adminListSessionAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("session_availability")
      .select(COLS)
      .order("weekday", { ascending: true })
      .order("slot_time", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SessionSlot[];
  });

const addSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  slot_time: z.string().regex(/^\d{2}:\d{2}$/, { message: "Saati SS:DD biçiminde yazın." }),
});

export const adminAddSessionSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => addSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [h, m] = data.slot_time.split(":");
    const { error } = await context.supabase.from("session_availability").insert({
      weekday: data.weekday,
      slot_time: `${h}:${m}:00`,
      active: true,
      sort_order: Number(h) * 60 + Number(m),
    } as never);
    if (error) {
      if (error.code === "23505" || /duplicate/i.test(error.message)) {
        throw new Error("Bu gün ve saat zaten tanımlı.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminSetSessionSlotActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("session_availability")
      .update({ active: data.active } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSessionSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("session_availability")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
