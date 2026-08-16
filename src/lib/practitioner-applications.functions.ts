import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";

export type ApplicationStatus =
  | "yeni"
  | "incelemede"
  | "belge_bekleniyor"
  | "gorusme"
  | "kabul"
  | "red";
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

// -------- AUTHENTICATED SUBMIT (FormData) --------
export const submitPractitionerApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("FormData bekleniyor");
    }
    const applicationSchema = z.object({
        full_name: z.string().trim().min(2).max(200),
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
    return { parsed, cv, diploma };
  })
  .handler(async ({ data, context }) => {
    const { parsed: base, cv, diploma } = data as {
      parsed: {
        full_name: string;
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
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // E-posta oturumdan alınır, form gövdesinden değil.
    const authEmail = String(
      (context.claims as { email?: string } | null)?.email ?? "",
    ).trim().toLowerCase();
    let resolvedEmail = authEmail;
    if (!resolvedEmail) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", context.userId)
        .maybeSingle();
      resolvedEmail = String(prof?.email ?? "").trim().toLowerCase();
    }
    if (!resolvedEmail) throw new Error("Hesabınızda kayıtlı e-posta bulunamadı.");
    const parsed = { ...base, email: resolvedEmail };

    // Aynı kullanıcı için reddedilmemiş başvuru varsa engelle.
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("practitioner_applications")
      .select("id, status")
      .eq("user_id", context.userId)
      .neq("status", "red")
      .limit(1);
    if (existingErr) throw new Error(existingErr.message);
    if (existing && existing.length > 0) {
      throw new Error(
        "Hesabınıza bağlı bir başvuru zaten var. Başvurunuzun durumunu Hesabım → Uygulayıcı sekmesinden takip edebilirsiniz.",
      );
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
        user_id: context.userId,
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

    // Başvurana onay e-postası (kırılmasın)
    try {
      const { sendEmail } = await import("@/lib/email/send.server");
      const { renderEmail, esc } = await import("@/lib/email/templates");
      const firstName = parsed.full_name.trim().split(/\s+/)[0] || parsed.full_name;
      await sendEmail({
        to: parsed.email,
        replyTo: "info@psychofunctionalanalysis.com",
        subject: "Başvurunuz alındı — PFA",
        html: renderEmail({
          title: "Başvurunuz alındı",
          bodyHtml: `
            <p>Merhaba ${esc(firstName)},</p>
            <p>PFA Uygulayıcı Programı'na gösterdiğiniz ilgi için teşekkür ederiz. Başvurunuz elimize ulaştı ve değerlendirmeye alındı.</p>
            <p>İnceleme tamamlandığında sonuçla ilgili size dönüş yapacağız.</p>
            <p>Sevgiyle,<br/>PFA Ekibi</p>`,
        }),
      });
    } catch (e) {
      console.error("[email] application sender confirmation failed", e);
    }

    return { ok: true };
  });

// -------- ADMIN --------
export type AdminApplicationRow = {
  id: string;
  user_id: string | null;
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
        "id, user_id, full_name, email, phone, city, category, profession_title, experience_years, motivation, cv_path, diploma_path, status, admin_note, created_at",
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
        status: z
          .enum(["yeni", "incelemede", "belge_bekleniyor", "gorusme", "kabul", "red"])
          .optional(),
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
    const { data: before } = await supabaseAdmin
      .from("practitioner_applications")
      .select("status, full_name, email, admin_note")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("practitioner_applications")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Durum 'kabul'e geçtiyse başvurana bilgilendirme (kırılmasın)
    if (data.status === "kabul" && before && before.status !== "kabul" && before.email) {
      try {
        const { sendEmail } = await import("@/lib/email/send.server");
        const { renderEmail, esc } = await import("@/lib/email/templates");
        const firstName =
          String(before.full_name ?? "").trim().split(/\s+/)[0] || String(before.full_name ?? "");
        await sendEmail({
          to: before.email,
          replyTo: "info@psychofunctionalanalysis.com",
          subject: "Başvurunuz kabul edildi — PFA",
          html: renderEmail({
            title: "Başvurunuz kabul edildi",
            bodyHtml: `
              <p>Merhaba ${esc(firstName)},</p>
              <p>Başvurunuz kabul edilmiştir. Sizi sonraki aşamalar için bilgilendireceğiz.</p>
              <p>Süreci <strong>Hesabım → Uygulayıcı</strong> sekmesinden takip edebilirsiniz.</p>
              <p>Sevgiyle,<br/>PFA Ekibi</p>`,
          }),
        });
      } catch (e) {
        console.error("[email] application status acceptance notify failed", e);
      }
    }

    // Durum 'belge_bekleniyor'a geçtiyse ek belge bilgilendirmesi (kırılmasın)
    if (
      data.status === "belge_bekleniyor" &&
      before &&
      before.status !== "belge_bekleniyor" &&
      before.email
    ) {
      try {
        const { sendEmail } = await import("@/lib/email/send.server");
        const { renderEmail, esc } = await import("@/lib/email/templates");
        const firstName =
          String(before.full_name ?? "").trim().split(/\s+/)[0] || String(before.full_name ?? "");
        const note =
          data.admin_note !== undefined ? data.admin_note : (before.admin_note as string | null);
        await sendEmail({
          to: before.email,
          replyTo: "info@psychofunctionalanalysis.com",
          subject: "Başvurunuz için ek belge bekleniyor — PFA",
          html: renderEmail({
            title: "Ek belge bekleniyor",
            bodyHtml: `
              <p>Merhaba ${esc(firstName)},</p>
              <p>Başvurunuzun belge incelemesi sırasında eksik ya da okunamayan bir belge tespit edildi. Süreci sürdürebilmemiz için ek belge bekliyoruz.</p>
              ${note ? `<p style="white-space:pre-wrap"><strong>Not:</strong> ${esc(note)}</p>` : ""}
              <p>Durumu <strong>Hesabım → Uygulayıcı</strong> sekmesinden takip edebilir, belgeyi bu e-postayı yanıtlayarak iletebilirsiniz.</p>
              <p>Sevgiyle,<br/>PFA Ekibi</p>`,
          }),
        });
      } catch (e) {
        console.error("[email] application document-request notify failed", e);
      }
    }
    return { ok: true };
  });

// -------- ADMIN: yeni başvuru sayacı (navigasyon bildirimi) --------
export const countNewPractitionerApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ count: number }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("practitioner_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "yeni");
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

// -------- KULLANICI DURUMU (Hesabım → Uygulayıcı) --------
export type MyPractitionerState = {
  isPro: boolean;
  /** Tek yetki kaynağı: pfa_pro entitlement (satın alma ile verilir). */
  hasProEntitlement: boolean;
  certificateStatus: "pending" | "issued" | "revoked" | null;
  directoryPublished: boolean;
  /** Açık (henüz tamamlanmamış) PFA-Pro lisans satın alma talebi. */
  licenseInquiry: { status: string; created_at: string } | null;
  application: {
    id: string;
    status: ApplicationStatus;
    category: PractitionerCategory;
    admin_note: string | null;
    created_at: string;
  } | null;
  practitioner: { id: string; published: boolean } | null;
  profile: { full_name: string | null; email: string | null };
};

export const PRO_LICENSE_SLUG = "pfa-pro-lisans-paketi";

export const getMyPractitionerState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPractitionerState> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const [appRes, practRes, rolesRes, profRes, entRes] = await Promise.all([
      supabaseAdmin
        .from("practitioner_applications")
        .select("id, status, category, admin_note, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1),
      supabaseAdmin.from("practitioners").select("id, published").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", uid),
      supabaseAdmin.from("profiles").select("full_name, email").eq("id", uid).maybeSingle(),
      supabaseAdmin
        .from("user_entitlements")
        .select("id, metadata, created_at")
        .eq("user_id", uid)
        .eq("type", "pfa_pro")
        .order("created_at", { ascending: false }),
    ]);
    const roles = ((rolesRes.data ?? []) as Array<{ role: string }>).map((r) => r.role);
    const ents = (entRes.data ?? []) as Array<{ metadata: Record<string, unknown> | null }>;
    const hasProEntitlement = ents.length > 0;
    const rawCert = String((ents[0]?.metadata as any)?.certificate_status ?? "");
    const certificateStatus =
      rawCert === "pending" || rawCert === "issued" || rawCert === "revoked" ? rawCert : null;

    const email = String(
      profRes.data?.email ?? (context.claims as { email?: string } | null)?.email ?? "",
    )
      .trim()
      .toLowerCase();
    let licenseInquiry: MyPractitionerState["licenseInquiry"] = null;
    if (email && !hasProEntitlement) {
      const { data: inq } = await supabaseAdmin
        .from("purchase_inquiries")
        .select("status, created_at")
        .eq("email", email)
        .eq("product_slug", PRO_LICENSE_SLUG)
        .not("status", "in", "(closed,fulfilled)")
        .order("created_at", { ascending: false })
        .limit(1);
      licenseInquiry = (inq?.[0] ?? null) as MyPractitionerState["licenseInquiry"];
    }

    return {
      isPro: roles.includes("pro") || roles.includes("admin"),
      hasProEntitlement,
      certificateStatus,
      directoryPublished: Boolean(practRes.data?.published),
      licenseInquiry,
      application: (appRes.data?.[0] ?? null) as MyPractitionerState["application"],
      practitioner: (practRes.data ?? null) as MyPractitionerState["practitioner"],
      profile: {
        full_name: profRes.data?.full_name ?? null,
        email: profRes.data?.email ?? (context.claims as { email?: string } | null)?.email ?? null,
      },
    };
  });

/**
 * 5. adım — PFA-Pro lisansı için havale/satın alma talebi oluşturur.
 * Ödeme sağlayıcısı henüz bağlı olmadığı için mevcut purchase_inquiries rayını kullanır.
 */
export const requestProLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", uid)
      .maybeSingle();
    const email = String(
      prof?.email ?? (context.claims as { email?: string } | null)?.email ?? "",
    )
      .trim()
      .toLowerCase();
    if (!email) throw new Error("Hesabınızda kayıtlı e-posta bulunamadı.");

    const { data: ent } = await supabaseAdmin
      .from("user_entitlements")
      .select("id")
      .eq("user_id", uid)
      .eq("type", "pfa_pro")
      .limit(1);
    if (ent && ent.length > 0) throw new Error("Lisansınız zaten tanımlı.");

    const { data: open } = await supabaseAdmin
      .from("purchase_inquiries")
      .select("id")
      .eq("email", email)
      .eq("product_slug", PRO_LICENSE_SLUG)
      .not("status", "in", "(closed,fulfilled)")
      .limit(1);
    if (open && open.length > 0) return { ok: true, already: true };

    const { data: app } = await supabaseAdmin
      .from("practitioner_applications")
      .select("full_name, phone")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1);

    const { createPurchaseInquiry } = await import("@/lib/purchase-inquiries.server");
    await createPurchaseInquiry({
      kind: "pro_license",
      product_slug: PRO_LICENSE_SLUG,
      product_label: "PFA-Pro Lisans Paketi",
      full_name: prof?.full_name || app?.[0]?.full_name || email,
      email,
      phone: app?.[0]?.phone ?? "",
      preferred_slot: "",
      message: "Uygulayıcı programı 5. adım — lisans talebi (Hesabım → Uygulayıcı).",
      addon_bundle_slug: null,
      book_lang: "tr",
      locale: "tr",
      website_hp: "",
    });
    return { ok: true, already: false };
  });

// -------- ADMIN: kullanıcıyı uygulayıcı yap --------
async function promoteToPractitioner(
  supabaseAdmin: any,
  input: {
    userId: string;
    full_name: string;
    email: string | null;
    city: string | null;
    category: PractitionerCategory;
    title?: string | null;
    long_bio?: string | null;
  },
): Promise<{ practitionerId: string; created: boolean }> {
  // NOT: 'pro' rolü burada VERİLMEZ. Tek yetki kaynağı PFA-Pro lisans satın alması
  // (handle_order_paid trigger'ı) olmalıdır.
  const { data: existing, error: exErr } = await supabaseAdmin
    .from("practitioners")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (exErr) throw new Error(exErr.message);
  if (existing?.id) return { practitionerId: existing.id as string, created: false };

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("practitioners")
    .insert({
      user_id: input.userId,
      full_name: input.full_name,
      category: input.category,
      title: input.title || null,
      city: input.city || null,
      long_bio: input.long_bio || null,
      country: "Türkiye",
      mode: "online",
      email: input.email,
      specializations: [],
      languages: [],
      published: false,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return { practitionerId: inserted.id as string, created: true };
}

export const acceptApplicationAsPractitioner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app, error } = await supabaseAdmin
      .from("practitioner_applications")
      .select("id, user_id, full_name, email, city, category, profession_title, motivation, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Başvuru bulunamadı");
    if (!app.user_id) {
      throw new Error(
        "Bu başvuru bir hesaba bağlı değil (eski kayıt). 'Bu kullanıcıyı uygulayıcı yap' ile e-posta üzerinden ilerleyin.",
      );
    }

    const alreadyAccepted = app.status === "kabul";

    const { error: upErr } = await supabaseAdmin
      .from("practitioner_applications")
      .update({ status: "kabul" })
      .eq("id", app.id);
    if (upErr) throw new Error(upErr.message);

    const res = await promoteToPractitioner(supabaseAdmin, {
      userId: app.user_id,
      full_name: app.full_name,
      email: app.email,
      city: app.city,
      category: app.category as PractitionerCategory,
      title: app.profession_title,
      long_bio: app.motivation,
    });

    // Kabul e-postası — yalnızca durum gerçekten 'kabul'e geçtiyse (kırılmasın)
    if (!alreadyAccepted && app.email) {
      try {
        const { sendEmail } = await import("@/lib/email/send.server");
        const { renderEmail, esc } = await import("@/lib/email/templates");
        const firstName = String(app.full_name ?? "").trim().split(/\s+/)[0] || app.full_name;
        await sendEmail({
          to: app.email,
          replyTo: "info@psychofunctionalanalysis.com",
          subject: "Başvurunuz kabul edildi — PFA",
          html: renderEmail({
            title: "Başvurunuz kabul edildi",
            bodyHtml: `
              <p>Merhaba ${esc(firstName)},</p>
              <p>PFA Uygulayıcı Programı başvurunuz kabul edildi.</p>
              <p>Sürecin bir sonraki adımı <strong>PFA-Pro lisansı</strong>dır. Lisans tamamlandığında uygulayıcı paneliniz ve danışan kontenjanınız açılır.</p>
              <p>Süreci <strong>Hesabım → Uygulayıcı</strong> sekmesinden takip edebilir, lisans adımını oradan başlatabilirsiniz.</p>
              <p>Sevgiyle,<br/>PFA Ekibi</p>`,
          }),
        });
      } catch (e) {
        console.error("[email] application acceptance notify failed", e);
      }
    }

    return { ok: true, ...res };
  });

export const makeUserPractitioner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(200),
        category: CATEGORY,
        city: z.string().trim().max(120).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", data.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prof) throw new Error("Bu e-posta ile bir hesap bulunamadı.");

    const res = await promoteToPractitioner(supabaseAdmin, {
      userId: prof.id,
      full_name: prof.full_name || data.email,
      email: prof.email ?? data.email,
      city: data.city || null,
      category: data.category as PractitionerCategory,
    });
    return { ok: true, ...res };
  });
