import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WAITLIST_BOOKS, WAITLIST_DEFAULT_PCT, WAITLIST_RATE_KEY, waitlistBookLabel } from "@/lib/waitlist";

const bookSlug = z.enum(WAITLIST_BOOKS.map((b) => b.slug) as [string, ...string[]]);

const entrySchema = z
  .object({
    product_slug: bookSlug,
    is_gift: z.boolean(),
    recipient_name: z.string().trim().max(120).optional().nullable(),
    recipient_email: z.string().trim().email("Geçerli bir e-posta girin.").max(200).optional().nullable().or(z.literal("")),
    gift_note: z.string().trim().max(500).optional().nullable(),
    dedication_name: z.string().trim().max(120).optional().nullable(),
  })
  .refine((d) => !d.is_gift || (!!d.recipient_name && !!d.recipient_email), {
    message: "Hediye için alıcının adı ve e-postası gerekli.",
  });

const clean = (d: z.infer<typeof entrySchema>) => ({
  product_slug: d.product_slug,
  is_gift: d.is_gift,
  recipient_name: d.is_gift ? d.recipient_name || null : null,
  recipient_email: d.is_gift ? (d.recipient_email || "").toLowerCase() || null : null,
  gift_note: d.is_gift ? d.gift_note || null : null,
  dedication_name: d.dedication_name || null,
});

async function readPct(sb: any): Promise<number> {
  const { data } = await sb.from("system_rates").select("value_numeric").eq("key", WAITLIST_RATE_KEY).maybeSingle();
  return Number(data?.value_numeric ?? WAITLIST_DEFAULT_PCT);
}

export const getWaitlistPct = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { pct: await readPct(supabaseAdmin) };
});

export const joinWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ entry: entrySchema, source: z.string().trim().max(40).default("site") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("book_waitlist")
      .insert({ ...clean(data.entry), user_id: context.userId, source: data.source || "site" })
      .select("id")
      .single();
    if (error || !row) throw new Error("Talebiniz kaydedilemedi, lütfen tekrar deneyin.");
    return { id: row.id as string };
  });

export const listMyWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("book_waitlist")
      .select("id, product_slug, is_gift, recipient_name, recipient_email, gift_note, dedication_name, status, created_at")
      .eq("user_id", context.userId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    return { rows: data ?? [], pct: await readPct(context.supabase) };
  });

export const updateMyWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), entry: entrySchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("book_waitlist")
      .update(clean(data.entry))
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["waiting", "notified"]);
    if (error) throw new Error("Güncellenemedi.");
    return { ok: true };
  });

export const cancelMyWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("book_waitlist")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["waiting", "notified"]);
    if (error) throw new Error("İptal edilemedi.");
    return { ok: true };
  });

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("book_waitlist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        full_name: (byId.get(r.user_id) as any)?.full_name ?? null,
        email: (byId.get(r.user_id) as any)?.email ?? null,
      })),
    };
  });

/** Ödeme açıldığında: her bekleyen kişiye kendi talebi için tek e-posta. Idempotent (notified_at). */
export const adminNotifyWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { PAYMENTS_LIVE } = await import("@/lib/payments-config");
    if (!PAYMENTS_LIVE) throw new Error("Kartlı ödeme henüz açık değil; bildirim ödeme açıldıktan sonra gönderilebilir.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail } = await import("@/lib/email/send.server");
    const { data: rows } = await supabaseAdmin
      .from("book_waitlist")
      .select("id, user_id, product_slug")
      .eq("status", "waiting")
      .is("notified_at", null);
    const pct = await readPct(supabaseAdmin);
    let sent = 0;
    for (const r of rows ?? []) {
      const { data: p } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", r.user_id).maybeSingle();
      if (!p?.email) continue;
      const res = await sendEmail({
        to: p.email,
        subject: "İmzalı nüshanız hazır — ödeme açıldı",
        html: `<p>Merhaba ${escapeHtml(p.full_name || "")},</p><p><strong>${escapeHtml(waitlistBookLabel(r.product_slug))}</strong> için ayırdığınız yer hazır. Bekleme listesine özel <strong>%${pct} indiriminiz</strong> tanımlı.</p><p><a href="https://psychofunctionalanalysis.com/hesabim?tab=waitlist">Hesabım → Taleplerim</a> sayfasından tek adımda tamamlayabilirsiniz.</p>`,
      });
      if (res.ok) {
        await supabaseAdmin.from("book_waitlist").update({ status: "notified", notified_at: new Date().toISOString() }).eq("id", r.id);
        sent++;
      }
    }
    return { sent };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
