// Server-only implementation for license inquiries.
import { getRequest } from "@tanstack/react-start/server";
import {
  LICENSE_TYPE_LABEL,
  type AdminLicenseInquiryRow,
  type LicenseInquiryInput,
  type LicenseStatus,
} from "@/lib/license-inquiries";

const SELECT_COLS =
  "id, type, full_name, email, phone, organisation, country, city, website, role, message, consent, status, admin_note, target_territory, existing_business_area, team_size, years_in_field, why_pfa, gtm_approach, institution_type, current_programmes, annual_trainee_volume, trainer_count, intended_use, expected_timeline, created_at";

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pfa-license:${ip}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

function clientIp(): string {
  try {
    const h = getRequest().headers;
    const fwd = h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "";
    return (fwd.split(",")[0] || "").trim();
  } catch {
    return "";
  }
}

export async function assertLicenseAdmin(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export async function createLicenseInquiry(data: LicenseInquiryInput): Promise<{ ok: boolean }> {
  if (data.website_hp && data.website_hp.length > 0) {
    // Silently accept — bot honeypot.
    return { ok: true };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = data.email.toLowerCase();
  const ip = clientIp();
  const ip_hash = ip ? await hashIp(ip) : null;

  // Rate limit: same e-mail within 10 minutes.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentEmail, error: reErr } = await supabaseAdmin
    .from("license_inquiries")
    .select("id")
    .eq("email", email)
    .gte("created_at", tenMinAgo)
    .limit(1);
  if (reErr) throw new Error(reErr.message);
  if (recentEmail && recentEmail.length > 0) {
    throw new Error(
      "Bu e-posta adresiyle az önce bir başvuru aldık. Lütfen 10 dakika sonra tekrar deneyin.",
    );
  }

  // Rate limit: same IP, at most 3 submissions per hour.
  if (ip_hash) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: ipErr } = await supabaseAdmin
      .from("license_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash)
      .gte("created_at", hourAgo);
    if (ipErr) throw new Error(ipErr.message);
    if ((count ?? 0) >= 3) {
      throw new Error(
        "Kısa sürede çok fazla başvuru gönderildi. Lütfen bir süre sonra tekrar deneyin.",
      );
    }
  }

  const row: Record<string, unknown> = {
    type: data.type,
    full_name: data.full_name,
    email,
    phone: data.phone || null,
    organisation: data.organisation || null,
    country: data.country || null,
    city: data.city || null,
    website: data.website || null,
    role: data.role || null,
    message: data.message,
    consent: true,
    status: "yeni",
    ip_hash,
    expected_timeline: data.expected_timeline || null,
  };

  if (data.type === "ulke") {
    row.target_territory = data.target_territory;
    row.existing_business_area = data.existing_business_area || null;
    row.team_size = data.team_size ?? null;
    row.years_in_field = data.years_in_field ?? null;
    row.why_pfa = data.why_pfa;
    row.gtm_approach = data.gtm_approach || null;
  } else {
    row.institution_type = data.institution_type;
    row.current_programmes = data.current_programmes || null;
    row.annual_trainee_volume = data.annual_trainee_volume ?? null;
    row.trainer_count = data.trainer_count ?? null;
    row.intended_use = data.intended_use;
  }

  const { error: insErr } = await supabaseAdmin.from("license_inquiries").insert(row as never);
  if (insErr) throw new Error(insErr.message);

  const typeLabel = LICENSE_TYPE_LABEL[data.type];

  // Admin bildirimi (kırılmasın)
  try {
    const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
    const { renderEmail, esc } = await import("@/lib/email/templates");
    const to = await getAdminNotificationEmail();
    const r = (label: string, value: string | number | null | undefined) =>
      `<tr><td style="padding:6px 0;color:#6b6355;width:180px">${esc(label)}</td><td>${
        esc(String(value ?? "")) || "—"
      }</td></tr>`;
    const specific =
      data.type === "ulke"
        ? [
            r("Hedef bölge", data.target_territory),
            r("Mevcut faaliyet alanı", data.existing_business_area),
            r("Ekip büyüklüğü", data.team_size),
            r("Alanda yıl", data.years_in_field),
          ].join("")
        : [
            r("Kurum tipi", data.institution_type),
            r("Mevcut programlar", data.current_programmes),
            r("Yıllık katılımcı", data.annual_trainee_volume),
            r("Eğitmen sayısı", data.trainer_count),
          ].join("");
    const longFields =
      data.type === "ulke"
        ? `<p style="margin-top:14px"><strong>Neden PFA</strong></p><p style="white-space:pre-wrap">${esc(
            data.why_pfa,
          )}</p>
           <p style="margin-top:14px"><strong>Pazara giriş yaklaşımı</strong></p><p style="white-space:pre-wrap">${esc(
             data.gtm_approach || "—",
           )}</p>`
        : `<p style="margin-top:14px"><strong>PFA'yı kullanım amacı</strong></p><p style="white-space:pre-wrap">${esc(
            data.intended_use,
          )}</p>`;
    const bodyHtml = `
      <p>Yeni bir lisans başvurusu alındı — <strong>${esc(typeLabel)}</strong>.</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        ${r("Ad Soyad", data.full_name)}
        ${r("E-posta", email)}
        ${r("Telefon", data.phone)}
        ${r("Kurum", data.organisation)}
        ${r("Rol", data.role)}
        ${r("Ülke / Şehir", [data.country, data.city].filter(Boolean).join(" / "))}
        ${r("Web sitesi", data.website)}
        ${r("Beklenen zaman planı", data.expected_timeline)}
        ${specific}
      </table>
      ${longFields}
      <p style="margin-top:14px"><strong>Mesaj</strong></p>
      <p style="white-space:pre-wrap">${esc(data.message)}</p>`;
    await sendEmail({
      to,
      replyTo: email,
      subject: `PFA — Yeni lisans başvurusu (${typeLabel}): ${data.full_name}`,
      html: renderEmail({ title: "Yeni lisans başvurusu", bodyHtml }),
    });
  } catch (e) {
    console.error("[email] license inquiry admin notify failed", e);
  }

  // Başvurana onay (kırılmasın)
  try {
    const { sendEmail } = await import("@/lib/email/send.server");
    const { renderEmail, esc } = await import("@/lib/email/templates");
    const firstName = data.full_name.trim().split(/\s+/)[0] || data.full_name;
    await sendEmail({
      to: email,
      replyTo: "info@psychofunctionalanalysis.com",
      subject: "Başvurunuz alındı — PFA Lisans",
      html: renderEmail({
        title: "Başvurunuz alındı",
        bodyHtml: `
          <p>Merhaba ${esc(firstName)},</p>
          <p>PFA ${esc(
            typeLabel.toLocaleLowerCase("tr-TR"),
          )} başvurunuz elimize ulaştı ve değerlendirmeye alındı.</p>
          <p>İnceleme tamamlandığında sonuçla ilgili size dönüş yapacağız. Lisans kapsamı ve koşulları, değerlendirme sonrasında karşılıklı görüşmeyle belirlenir.</p>
          <p>Sevgiyle,<br/>PFA Ekibi</p>`,
      }),
    });
  } catch (e) {
    console.error("[email] license inquiry sender confirmation failed", e);
  }

  return { ok: true };
}

export async function fetchAdminLicenseInquiries(): Promise<AdminLicenseInquiryRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("license_inquiries")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminLicenseInquiryRow[];
}

export async function patchAdminLicenseInquiry(input: {
  id: string;
  status?: LicenseStatus;
  admin_note?: string | null;
}): Promise<{ ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch: { status?: LicenseStatus; admin_note?: string | null } = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.admin_note !== undefined) patch.admin_note = input.admin_note;
  if (Object.keys(patch).length === 0) return { ok: true };
  const { error } = await supabaseAdmin
    .from("license_inquiries")
    .update(patch)
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
