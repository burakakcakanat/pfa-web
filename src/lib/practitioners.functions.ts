import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";

export type PractitionerCategory = "terapotik" | "kocluk" | "pedagojik" | "kurumsal";
export type PractitionerMode = "online" | "yuz_yuze" | "her_ikisi";
/** Rozet kademesi — genişletilebilir (yeni kademe eklenirse burada büyütülür). */
export type BadgeTier = "resident_fellow" | "fellow" | "practitioner";

export interface PractitionerPublic {
  id: string;
  full_name: string;
  category: PractitionerCategory;
  title: string | null;
  photo_url: string | null;
  short_bio: string | null;
  long_bio: string | null;
  specializations: string[];
  languages: string[];
  city: string | null;
  country: string;
  mode: PractitionerMode;
  website: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * Rehberde rozet GÖSTERİLMEZ; kademe yalnızca sıralama için sunucu tarafında
 * kullanılır ve istemciye sızdırılmaz.
 */
const TIER_RANK: Record<BadgeTier, number> = {
  resident_fellow: 0,
  fellow: 1,
  practitioner: 2,
};


function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
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

export const listPublicPractitioners = createServerFn({ method: "GET" }).handler(
  async (): Promise<PractitionerPublic[]> => {
    const supabase = serverPublicClient();
    const { data, error } = await supabase
      .from("practitioners_public")
      .select(
        "id, full_name, category, title, photo_url, short_bio, long_bio, specializations, languages, city, country, mode, website, sort_order, created_at, badge_tier",
      )
      .order("sort_order", { ascending: true })
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as (PractitionerPublic & { badge_tier?: string })[];
    // Sıralama: Fellow'lar önce, sonra Practitioner'lar; kademe etiketi
    // istemciye gönderilmez (rehber rozetsizdir).
    return rows
      .slice()
      .sort((a, b) => {
        const ra = TIER_RANK[(a.badge_tier as BadgeTier) ?? "practitioner"] ?? 2;
        const rb = TIER_RANK[(b.badge_tier as BadgeTier) ?? "practitioner"] ?? 2;
        if (ra !== rb) return ra - rb;
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.full_name.localeCompare(b.full_name, "tr");
      })
      .map(({ badge_tier: _bt, ...rest }) => rest as PractitionerPublic);
  },
);

export const getPublicPractitioner = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<PractitionerPublic | null> => {
    const supabase = serverPublicClient();
    const { data: row, error } = await supabase
      .from("practitioners_public")
      .select(
        "id, full_name, category, title, photo_url, short_bio, long_bio, specializations, languages, city, country, mode, website, sort_order, created_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as PractitionerPublic | null) ?? null;
  });


// Public inquiry submission. Honeypot field `website_hp` must be empty.
// Uses supabaseAdmin server-side so the practitioner's email is read
// on the server only and NEVER returned to the caller.
const inquirySchema = z.object({
  practitioner_id: z.string().uuid(),
  sender_name: z.string().trim().min(2).max(120),
  sender_email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(["tr", "en"]).optional(),
  website_hp: z.string().max(0).optional().default(""),
});

export const submitPractitionerInquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => parseFriendly(inquirySchema, d))
  .handler(async ({ data }) => {
    if (data.website_hp && data.website_hp.length > 0) {
      // Silently accept — bot honeypot.
      return { ok: true };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify practitioner is published; read email server-side only.
    const { data: p, error: pErr } = await supabaseAdmin
      .from("practitioners")
      .select("id, full_name, email, published")
      .eq("id", data.practitioner_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!p || !p.published) throw new Error("Uygulayıcı bulunamadı");

    const { error: insErr } = await supabaseAdmin.from("practitioner_inquiries").insert({
      practitioner_id: data.practitioner_id,
      sender_name: data.sender_name,
      sender_email: data.sender_email,
      message: data.message,
      locale: (await import("@/lib/locale.server")).resolveLocale(
        (data as { locale?: string }).locale,
      ),
    });
    if (insErr) throw new Error(insErr.message);

    // E-posta bildirimi — uygulayıcıya ad + kısa önizleme (mesaj gövdesi yok).
    if (p.email) {
      const { sendEmail } = await import("@/lib/email/send.server");
      const { renderEmail, esc } = await import("@/lib/email/templates");
      const firstName = (data.sender_name.trim().split(/\s+/)[0] ?? "").slice(0, 60);
      const preview = data.message.trim().replace(/\s+/g, " ").slice(0, 80);
      const bodyHtml = `
        <p>Merhaba ${esc(p.full_name)},</p>
        <p><strong>${esc(firstName)}</strong> adında bir kişi PFA uygulayıcı profilinizden size ulaştı.</p>
        <p style="border-left:3px solid #C9A96A;padding:8px 12px;background:#F7F3EA;color:#4a4a4a;font-style:italic">
          "${esc(preview)}${data.message.length > 80 ? "…" : ""}"
        </p>
        <p>Yanıt vermek için PFA panelinize giriş yapabilirsiniz. Gönderenin e-postası panelde görünür.</p>`;
      await sendEmail({
        to: p.email,
        subject: "PFA — Yeni bir mesajınız var",
        html: renderEmail({ title: "Yeni bir mesajınız var", bodyHtml }),
      });
    }

    return { ok: true };
  });

// -------- KENDİ REHBER KARTIM (yayında olsun/olmasın) --------
export type MyPractitionerRow = PractitionerPublic & { published: boolean };

/**
 * Hesabım → Uygulayıcı panelindeki "Rehber kartım" önizlemesi için — RLS ile
 * yalnızca oturum sahibinin kendi satırını döndürür (yayınlanmamış olsa bile).
 */
export const getMyPractitionerRow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPractitionerRow | null> => {
    const { supabase, userId } = context;
    const { data: p, error } = await supabase
      .from("practitioners")
      .select(
        "id, full_name, category, title, photo_url, short_bio, long_bio, specializations, languages, city, country, mode, website, sort_order, created_at, published, user_id",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return null;

    const { user_id: _uid, ...rest } = p as unknown as Record<string, unknown> & { user_id: string };
    return { ...(rest as unknown as PractitionerPublic), published: Boolean(p.published) };
  });

