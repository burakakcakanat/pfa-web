import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseFriendly, parseFriendlyEn } from "@/lib/zod-friendly";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10).max(4000),
  website_hp: z.string().max(0).optional().default(""),
  locale: z.enum(["tr", "en"]).optional().default("tr"),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    (d as { locale?: string } | null)?.locale === "en"
      ? parseFriendlyEn(schema, d)
      : parseFriendly(schema, d),
  )
  .handler(async ({ data }) => {
    if (data.website_hp && data.website_hp.length > 0) return { ok: true };
    const { resolveLocale } = await import("@/lib/locale.server");
    const locale = resolveLocale(data.locale);
    const en = locale === "en";

    // 1) Persist message first — this must always succeed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin.from("contact_messages").insert({
      full_name: data.full_name,
      email: data.email,
      subject: data.subject || "",
      message: data.message,
      locale,
    });
    if (insErr) {
      console.error("[contact] persist failed", insErr);
      throw new Error(
        en
          ? "Your message could not be saved. Please try again shortly."
          : "Mesajınız kaydedilemedi. Lütfen kısa süre sonra tekrar deneyin.",
      );
    }

    // 2) Best-effort email notification (errors never break the flow).
    try {
      const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
      const { renderEmail, esc } = await import("@/lib/email/templates");
      const to = await getAdminNotificationEmail();
      const bodyHtml = `
        ${
          en
            ? `<p style="background:#0f766e;color:#ffffff;display:inline-block;padding:6px 12px;border-radius:4px;font-size:13px;letter-spacing:.08em">EN — İNGİLİZCE SİTEDEN GELDİ, YANITI İNGİLİZCE YAZIN</p>`
            : ""
        }
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#6b6355;width:120px">Gönderen</td><td>${esc(data.full_name)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">E-posta</td><td>${esc(data.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Konu</td><td>${esc(data.subject || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6355">Mesaj dili</td><td>${en ? "EN (İngilizce)" : "TR (Türkçe)"}</td></tr>
        </table>
        <p style="margin-top:14px"><strong>Mesaj</strong></p>
        <p style="white-space:pre-wrap">${esc(data.message)}</p>`;
      await sendEmail({
        to,
        replyTo: data.email,
        subject: `${en ? "[EN] " : ""}PFA — İletişim: ${data.subject || data.full_name}`,
        html: renderEmail({ title: "Yeni iletişim mesajı", bodyHtml }),
      });
    } catch (e) {
      console.error("[email] contact admin notify failed", e);
    }

    // 3) Gönderene onay e-postası (kırılmasın).
    try {
      const { sendEmail } = await import("@/lib/email/send.server");
      const { renderEmail, esc } = await import("@/lib/email/templates");
      const firstName = data.full_name.trim().split(/\s+/)[0] || data.full_name;
      const subjectRef = data.subject
        ? `<p style="color:#6b6355;font-size:14px">Konu: <strong>${esc(data.subject)}</strong></p>`
        : "";
      const subjectRefEn = data.subject
        ? `<p style="color:#6b6355;font-size:14px">Subject: <strong>${esc(data.subject)}</strong></p>`
        : "";
      await sendEmail({
        to: data.email,
        replyTo: "info@psychofunctionalanalysis.com",
        subject: en ? "We have received your message — PFA" : "Mesajınız bize ulaştı — PFA",
        html: en
          ? renderEmail({
              title: "We have received your message",
              bodyHtml: `
            <p>Hello ${esc(firstName)},</p>
            <p>Thank you for writing to us. Your message has reached us and we will get back to you as soon as we can.</p>
            ${subjectRefEn}
            <p>Warm regards,<br/>The PFA team</p>`,
            })
          : renderEmail({
              title: "Mesajınız elimize ulaştı",
              bodyHtml: `
            <p>Merhaba ${esc(firstName)},</p>
            <p>Bize yazdığınız için teşekkür ederiz. Mesajınız elimize ulaştı ve en kısa sürede size dönüş yapacağız.</p>
            ${subjectRef}
            <p>Sevgiyle,<br/>PFA Ekibi</p>`,
            }),
      });
    } catch (e) {
      console.error("[email] contact sender confirmation failed", e);
    }
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .select("id, full_name, email, subject, message, is_read, read_at, locale, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    // Rol çözümlemesi sunucuda: e-posta profiles'ta eşleşiyorsa rol rozeti,
    // eşleşmiyorsa "Ziyaretçi".
    const emails = Array.from(
      new Set(rows.map((m) => (m.email ?? "").trim().toLowerCase()).filter(Boolean)),
    );
    const byEmail = new Map<string, "admin" | "fellow" | "pfap" | "user">();
    if (emails.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("email", emails);
      const ids = (profs ?? []).map((p) => p.id);
      const roleByUser = new Map<string, Set<string>>();
      const tierByUser = new Map<string, string>();
      if (ids.length > 0) {
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", ids);
        for (const r of roles ?? []) {
          const s = roleByUser.get(r.user_id) ?? new Set<string>();
          s.add(r.role as string);
          roleByUser.set(r.user_id, s);
        }
        const { data: accs } = await supabaseAdmin
          .from("practitioner_accounts")
          .select("user_id, tier")
          .in("user_id", ids);
        for (const a of accs ?? []) tierByUser.set(a.user_id, a.tier);
      }
      for (const p of profs ?? []) {
        const set = roleByUser.get(p.id) ?? new Set<string>();
        const tier = tierByUser.get(p.id);
        const role = set.has("admin")
          ? "admin"
          : set.has("fellow") || tier === "fellow" || tier === "resident_fellow"
            ? "fellow"
            : set.has("pro")
              ? "pfap"
              : "user";
        if (p.email) byEmail.set(p.email.trim().toLowerCase(), role as any);
      }
    }

    const messages = rows.map((m) => ({
      ...m,
      sender_role: byEmail.get((m.email ?? "").trim().toLowerCase()) ?? ("guest" as const),
    }));
    const unread = messages.filter((m) => !m.is_read).length;
    return { messages, unread };
  });


export const markContactMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_read: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .update({ is_read: data.is_read, read_at: data.is_read ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
