import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PractitionerCategory = "terapotik" | "kocluk" | "pedagojik" | "kurumsal";
export type PractitionerMode = "online" | "yuz_yuze" | "her_ikisi";

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
        "id, full_name, category, title, photo_url, short_bio, long_bio, specializations, languages, city, country, mode, website, sort_order, created_at",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PractitionerPublic[];
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
export const submitPractitionerInquiry = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        practitioner_id: z.string().uuid(),
        sender_name: z.string().trim().min(2).max(120),
        sender_email: z.string().trim().email().max(200),
        message: z.string().trim().min(10).max(4000),
        website_hp: z.string().max(0).optional().default(""),
      })
      .parse(d),
  )
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
    });
    if (insErr) throw new Error(insErr.message);

    // TODO: E-posta bildirimi. Gerçek e-posta sağlayıcı entegrasyonu (Resend/Postmark)
    // eklendiğinde burada p.email adresine mail gönderilecek.
    // Şimdilik yalnızca sunucu tarafında loglanır; e-posta adresi asla client'a dönmez.
    if (typeof console !== "undefined") {
      console.info(
        `[practitioner-inquiry] queued for practitioner ${p.id} (${p.full_name})`,
      );
    }

    return { ok: true };
  });