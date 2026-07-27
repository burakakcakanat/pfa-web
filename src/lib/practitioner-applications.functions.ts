import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";

export type ApplicationStatus = "yeni" | "incelemede" | "gorusme" | "kabul" | "red";
export type PractitionerCategory = "terapotik" | "kocluk" | "pedagojik" | "kurumsal";

const CATEGORY = z.enum(["terapotik", "kocluk", "pedagojik", "kurumsal"]);
const ALLOWED_CV = ["application/pdf"];
const ALLOWED_DIPLOMA = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// -------- PUBLIC SUBMIT (FormData) --------
export const submitPractitionerApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("FormData bekleniyor");
    }
    const website_hp = String(data.get("website_hp") ?? "");
    const applicationSchema = z.object({
        full_name: z.string().trim().min(2).max(200),
        email: z.string().trim().toLowerCase().email().max(200),
        phone: z.string().trim().max(60).optional().default(""),
        city: z.string().trim().max(120).optional().default(""),
        category: CATEGORY,
        profession_title: z.string().trim().max(200).optional().default(""),
        experience_years: z.coerce.number().int().min(0).max(80).optional(),
        motivation: z.string().trim().min(200).max(1500),
        kvkk_accepted: z.literal("true"),
      });
    const parsed = parseFriendly(applicationSchema, {
        full_name: data.get("full_name"),
        email: data.get("email"),
        phone: data.get("phone") ?? "",
        city: data.get("city") ?? "",
        category: data.get("category"),
        profession_title: data.get("profession_title") ?? "",
        experience_years: data.get("experience_years") || undefined,
        motivation: data.get("motivation"),
        kvkk_accepted: data.get("kvkk_accepted"),
      });

    const cv = data.get("cv");
    const diploma = data.get("diploma");
    return { parsed, cv, diploma, website_hp };
  })
  .handler(async ({ data }) => {
    const { parsed, cv, diploma, website_hp } = data as {
      parsed: {
        full_name: string;
        email: string;
        phone: string;
        city: string;
        category: PractitionerCategory;
        profession_title: string;
        experience_years?: number;
        motivation: string;
        kvkk_accepted: "true";
      };
      cv: FormDataEntryValue | null;
      diploma: FormDataEntryValue | null;
      website_hp: string;
    };

    // Honeypot: sessizce başarı döndür
    if (website_hp && website_hp.length > 0) {
      return { ok: true };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Basit rate limit: son 10 dakikada aynı e-posta ile başvuru varsa reddet.
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent, error: recentErr } = await supabaseAdmin
      .from("practitioner_applications")
      .select("id")
      .eq("email", parsed.email)
      .gte("created_at", tenMinAgo)
      .limit(1);
    if (recentErr) throw new Error(recentErr.message);
    if (recent && recent.length > 0) {
      throw new Error(
        "Bu e-posta ile kısa süre önce bir başvuru alındı. Lütfen bir süre sonra tekrar deneyin.",
      );
    }
    // Günlük tavan: aynı e-posta ile 24 saatte 3
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: daily } = await supabaseAdmin
      .from("practitioner_applications")
      .select("id")
      .eq("email", parsed.email)
      .gte("created_at", dayAgo);
    if ((daily?.length ?? 0) >= 3) {
      throw new Error("Bu e-posta için günlük başvuru sınırına ulaşıldı.");
    }

    // Dosyaları doğrula ve yükle
    const uploadFile = async (
      file: FormDataEntryValue | null,
      allowed: string[],
      prefix: string,
      required: boolean,
    ): Promise<string | null> => {
      if (!file || typeof file === "string") {
        if (required) throw new Error(`${prefix} dosyası gerekli`);
        return null;
      }
      const blob = file as unknown as File;
      if (!blob.size) {
        if (required) throw new Error(`${prefix} dosyası boş`);
        return null;
      }
      if (blob.size > MAX_BYTES) {
        throw new Error(`${prefix} dosyası 10MB sınırını aşıyor`);
      }
      if (!allowed.includes(blob.type)) {
        throw new Error(`${prefix} için izin verilmeyen dosya tipi`);
      }
      const ext = (blob.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${prefix}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("applicant-docs")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw new Error(`Yükleme hatası: ${upErr.message}`);
      return path;
    };

    const cv_path = await uploadFile(cv, ALLOWED_CV, "cv", true);
    const diploma_path = await uploadFile(diploma, ALLOWED_DIPLOMA, "diploma", false);

    const { error: insErr } = await supabaseAdmin
      .from("practitioner_applications")
      .insert({
        full_name: parsed.full_name,
        email: parsed.email,
        phone: parsed.phone || null,
        city: parsed.city || null,
        category: parsed.category,
        profession_title: parsed.profession_title || null,
        experience_years: parsed.experience_years ?? null,
        motivation: parsed.motivation,
        cv_path,
        diploma_path,
        kvkk_accepted: true,
        status: "yeni",
      });
    if (insErr) throw new Error(insErr.message);

    // Admin bildirim e-postası (kırılmasın)
    try {
      const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
      const { renderEmail, esc } = await import("@/lib/email/templates");
      const to = await getAdminNotificationEmail();
      const categoryLabel: Record<PractitionerCategory, string> = {
        terapotik: "Terapötik",
        kocluk: "Koçluk",
        pedagojik: "Pedagojik",
        kurumsal: "Kurumsal",
      };
      const bodyHtml = `
        <p>Yeni bir uygulayıcı başvurusu alındı.</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#6b6355;width:140px">Ad Soyad</td><td>${esc(parsed.full_name)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">E-posta</td><td>${esc(parsed.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Telefon</td><td>${esc(parsed.phone || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Şehir</td><td>${esc(parsed.city || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Kategori</td><td>${esc(categoryLabel[parsed.category])}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Unvan</td><td>${esc(parsed.profession_title || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Deneyim (yıl)</td><td>${esc(String(parsed.experience_years ?? "—"))}</td></tr>
        </table>
        <p style="margin-top:14px"><strong>Motivasyon</strong></p>
        <p style="white-space:pre-wrap">${esc(parsed.motivation)}</p>`;
      await sendEmail({
        to,
        replyTo: parsed.email,
        subject: `PFA — Yeni uygulayıcı başvurusu: ${parsed.full_name}`,
        html: renderEmail({ title: "Yeni uygulayıcı başvurusu", bodyHtml }),
      });
    } catch (e) {
      console.error("[email] application admin notify failed", e);
    }

    return { ok: true };
  });

// -------- ADMIN --------
export type AdminApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  category: PractitionerCategory;
  profession_title: string | null;
  experience_years: number | null;
  motivation: string;
  cv_path: string | null;
  diploma_path: string | null;
  status: ApplicationStatus;
  admin_note: string | null;
  created_at: string;
};

export const listAdminApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminApplicationRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("practitioner_applications")
      .select(
        "id, full_name, email, phone, city, category, profession_title, experience_years, motivation, cv_path, diploma_path, status, admin_note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminApplicationRow[];
  });

export const getAdminApplicationFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ path: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("applicant-docs")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const updateAdminApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["yeni", "incelemede", "gorusme", "kabul", "red"]).optional(),
        admin_note: z.string().max(5000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status?: ApplicationStatus; admin_note?: string | null } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.admin_note !== undefined) patch.admin_note = data.admin_note;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("practitioner_applications")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
