// Server-only implementation for purchase (havale) inquiries.
// NOTE: bank / IBAN details are never stored, published or e-mailed from here.
import { getRequest } from "@tanstack/react-start/server";
import {
  PURCHASE_KIND_LABEL,
  paymentReferenceFor,
  type AdminPurchaseInquiryRow,
  type BankTransferDetails,
  type PurchaseInquiryInput,
  type PurchaseInquiryStatus,
} from "@/lib/purchase-inquiries";

const SELECT_COLS =
  "id, kind, product_slug, product_label, full_name, email, phone, preferred_slot, message, status, admin_note, locale, created_at, updated_at, payment_reference, transfer_amount, transfer_currency, transfer_sent_at";

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pfa-purchase:${ip}`));
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

export async function assertPurchaseAdmin(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export async function createPurchaseInquiry(
  data: PurchaseInquiryInput,
): Promise<{ ok: boolean }> {
  if (data.website_hp && data.website_hp.length > 0) {
    // Silently accept — bot honeypot.
    return { ok: true };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = data.email.toLowerCase();
  const ip = clientIp();
  const ip_hash = ip ? await hashIp(ip) : null;

  // Rate limit: same e-mail + product within 10 minutes.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent, error: reErr } = await supabaseAdmin
    .from("purchase_inquiries")
    .select("id")
    .eq("email", email)
    .eq("product_slug", data.product_slug)
    .gte("created_at", tenMinAgo)
    .limit(1);
  if (reErr) throw new Error(reErr.message);
  if (recent && recent.length > 0) {
    throw new Error(
      "Bu e-posta adresiyle az önce bir talep aldık. Lütfen 10 dakika sonra tekrar deneyin.",
    );
  }

  // Rate limit: same IP, at most 5 submissions per hour.
  if (ip_hash) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: ipErr } = await supabaseAdmin
      .from("purchase_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash)
      .gte("created_at", hourAgo);
    if (ipErr) throw new Error(ipErr.message);
    if ((count ?? 0) >= 5) {
      throw new Error(
        "Kısa sürede çok fazla talep gönderildi. Lütfen bir süre sonra tekrar deneyin.",
      );
    }
  }

  const label = (data.product_label || "").trim() || data.product_slug;

  const { error: insErr } = await supabaseAdmin.from("purchase_inquiries").insert({
    kind: data.kind,
    product_slug: data.product_slug,
    product_label: label,
    full_name: data.full_name,
    email,
    phone: data.phone || null,
    preferred_slot: data.preferred_slot || null,
    message: data.message || null,
    status: "new",
    ip_hash,
  } as never);
  if (insErr) throw new Error(insErr.message);

  const kindLabel = PURCHASE_KIND_LABEL[data.kind];

  // Admin notification (must not break the flow)
  try {
    const { sendEmail, getAdminNotificationEmail } = await import("@/lib/email/send.server");
    const { renderEmail, esc } = await import("@/lib/email/templates");
    const to = await getAdminNotificationEmail();
    const r = (l: string, v: string | null | undefined) =>
      `<tr><td style="padding:6px 0;color:#6b6355;width:180px">${esc(l)}</td><td>${
        esc(String(v ?? "")) || "—"
      }</td></tr>`;
    const bodyHtml = `
      <p>Yeni bir satış talebi alındı — <strong>${esc(kindLabel)}</strong>.</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        ${r("Ürün", label)}
        ${r("Ürün kodu", data.product_slug)}
        ${r("Ad Soyad", data.full_name)}
        ${r("E-posta", email)}
        ${r("Telefon", data.phone)}
        ${r("Tercih edilen zaman", data.preferred_slot)}
      </table>
      <p style="margin-top:14px"><strong>Mesaj</strong></p>
      <p style="white-space:pre-wrap">${esc(data.message || "—")}</p>
      <p style="margin-top:14px;color:#6b6355;font-size:13px">Havale bilgileri otomatik gönderilmedi; talep sahibine kişisel olarak iletilmelidir.</p>`;
    await sendEmail({
      to,
      replyTo: email,
      subject: `PFA — Yeni satış talebi (${kindLabel}): ${data.full_name}`,
      html: renderEmail({ title: "Yeni satış talebi", bodyHtml }),
    });
  } catch (e) {
    console.error("[email] purchase inquiry admin notify failed", e);
  }

  // Requester confirmation — deliberately contains no payment details.
  try {
    const { sendEmail } = await import("@/lib/email/send.server");
    const { renderEmail, esc } = await import("@/lib/email/templates");
    const firstName = data.full_name.trim().split(/\s+/)[0] || data.full_name;
    await sendEmail({
      to: email,
      replyTo: "info@psychofunctionalanalysis.com",
      subject: "Talebiniz alındı — PFA",
      html: renderEmail({
        title: "Talebiniz alındı",
        bodyHtml: `
          <p>Merhaba ${esc(firstName)},</p>
          <p><strong>${esc(label)}</strong> için talebiniz elimize ulaştı.</p>
          ${
            data.preferred_slot
              ? `<p>Belirttiğiniz zaman tercihi: <strong>${esc(data.preferred_slot)}</strong></p>`
              : ""
          }
          <p>En geç 24 saat içinde size dönüş yapacağız; katılım ve ödeme adımlarını o görüşmede birlikte netleştireceğiz.</p>
          <p>Sevgiyle,<br/>PFA Ekibi</p>`,
      }),
    });
  } catch (e) {
    console.error("[email] purchase inquiry confirmation failed", e);
  }

  return { ok: true };
}

export async function fetchAdminPurchaseInquiries(): Promise<AdminPurchaseInquiryRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("purchase_inquiries")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as AdminPurchaseInquiryRow[];
  const slugs = Array.from(new Set(rows.map((r) => r.product_slug).filter(Boolean)));
  if (slugs.length > 0) {
    const { data: prods } = await supabaseAdmin
      .from("products")
      .select("slug, price_cents")
      .in("slug", slugs);
    const bySlug = new Map(
      (prods ?? []).map((p) => [p.slug as string, p.price_cents as number | null]),
    );
    for (const r of rows) r.catalogue_price_cents = bySlug.get(r.product_slug) ?? null;
  }
  return rows;
}

// ---------------- Bank transfer details (service role only) ----------------
// Stored in public.bank_transfer_details (singleton row, id = true). That table
// has RLS enabled with ZERO policies and no grants to anon/authenticated, so
// only the service-role client below can read it. The IBAN is never placed in
// site_settings and never reaches a browser client.

const EMPTY_BANK: BankTransferDetails = {
  account_holder: "",
  bank_name: "",
  iban: "",
  currency: "TRY",
  note: "",
};

export async function fetchBankTransferDetails(): Promise<BankTransferDetails> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bank_transfer_details")
    .select("account_holder, bank_name, iban, currency, note")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BankTransferDetails | null) ?? EMPTY_BANK;
}

export async function saveBankTransferDetails(
  input: BankTransferDetails,
): Promise<{ ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("bank_transfer_details").upsert(
    {
      id: true,
      account_holder: input.account_holder,
      bank_name: input.bank_name,
      iban: input.iban,
      currency: (input.currency || "TRY").toUpperCase(),
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

const STATUS_RANK: Record<PurchaseInquiryStatus, number> = {
  new: 0,
  contacted: 1,
  paid: 2,
  fulfilled: 3,
  closed: 4,
};

function fmtAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

async function fetchInquiry(id: string): Promise<AdminPurchaseInquiryRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("purchase_inquiries")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Talep bulunamadı");
  return data as unknown as AdminPurchaseInquiryRow;
}

export async function sendTransferInstructions(input: {
  id: string;
  amount: number;
  currency: string;
}): Promise<{ ok: boolean; payment_reference: string; transfer_sent_at: string }> {
  const inq = await fetchInquiry(input.id);
  const bank = await fetchBankTransferDetails();
  if (!bank.iban || !bank.account_holder || !bank.bank_name) {
    throw new Error("Havale bilgileri eksik — Ayarlar → Havale Bilgileri panelini doldurun.");
  }

  const reference = inq.payment_reference || paymentReferenceFor(inq.id);
  const currency = (input.currency || bank.currency || "TRY").toUpperCase();
  const label = inq.product_label || inq.product_slug;
  const firstName = inq.full_name.trim().split(/\s+/)[0] || inq.full_name;

  const { sendEmail } = await import("@/lib/email/send.server");
  const { renderEmail, esc } = await import("@/lib/email/templates");
  const row = (l: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#6b6355;width:170px">${esc(l)}</td><td><strong>${esc(
      v,
    )}</strong></td></tr>`;
  const res = await sendEmail({
    to: inq.email,
    replyTo: "info@psychofunctionalanalysis.com",
    subject: `Havale bilgileri — ${label}`,
    html: renderEmail({
      title: "Havale bilgileri",
      bodyHtml: `
        <p>Merhaba ${esc(firstName)},</p>
        <p><strong>${esc(label)}</strong> için havale/EFT bilgileri aşağıda yer alıyor.</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          ${row("Tutar", fmtAmount(input.amount, currency))}
          ${row("Alıcı", bank.account_holder)}
          ${row("Banka", bank.bank_name)}
          ${row("IBAN", bank.iban)}
          ${row("Ödeme referansı", reference)}
        </table>
        <p style="margin-top:14px">Transfer açıklamasına <strong>${esc(
          reference,
        )}</strong> kodunu yazın; ödemenizi bu kodla eşleştiriyoruz.</p>
        ${bank.note ? `<p>${esc(bank.note)}</p>` : ""}
        <p>Ödeme alındıktan sonra erişiminiz/randevunuz netleşir ve size bilgi veririz.</p>
        <p>Sevgiyle,<br/>PFA Ekibi</p>`,
    }),
  });
  if (!res.ok) throw new Error(`E-posta gönderilemedi (${res.error ?? "bilinmiyor"})`);

  const sentAt = new Date().toISOString();
  const patch: Record<string, unknown> = {
    payment_reference: reference,
    transfer_amount: input.amount,
    transfer_currency: currency,
    transfer_sent_at: sentAt,
  };
  // Status only moves forward — never back to "contacted" from a later stage.
  if (STATUS_RANK[inq.status] < STATUS_RANK.contacted) patch.status = "contacted";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("purchase_inquiries")
    .update(patch as never)
    .eq("id", inq.id);
  if (error) throw new Error(error.message);

  return { ok: true, payment_reference: reference, transfer_sent_at: sentAt };
}

const NEXT_STEP: Record<string, string> = {
  session: "Randevu planlaması için kısa süre içinde sizinle iletişime geçeceğiz.",
  webinar: "Katılım bilgilerini oturum öncesinde e-posta ile paylaşacağız.",
  pro_license: "Lisans kurulumu için kısa süre içinde sizinle iletişime geçeceğiz.",
  corporate: "Kurumsal kurulum için kısa süre içinde sizinle iletişime geçeceğiz.",
};

async function sendPaymentReceived(inq: AdminPurchaseInquiryRow): Promise<void> {
  const { sendEmail } = await import("@/lib/email/send.server");
  const { renderEmail, esc } = await import("@/lib/email/templates");
  const firstName = inq.full_name.trim().split(/\s+/)[0] || inq.full_name;
  const label = inq.product_label || inq.product_slug;
  await sendEmail({
    to: inq.email,
    replyTo: "info@psychofunctionalanalysis.com",
    subject: `Ödemenizi aldık — ${label}`,
    html: renderEmail({
      title: "Ödemenizi aldık",
      bodyHtml: `
        <p>Merhaba ${esc(firstName)},</p>
        <p><strong>${esc(label)}</strong> için ödemenizi aldık, teşekkür ederiz.</p>
        <p>${esc(
          NEXT_STEP[inq.kind] ?? "Sonraki adım için kısa süre içinde sizinle iletişime geçeceğiz.",
        )}</p>
        <p>Sevgiyle,<br/>PFA Ekibi</p>`,
    }),
  });
}

export async function patchAdminPurchaseInquiry(input: {
  id: string;
  status?: PurchaseInquiryStatus;
  admin_note?: string | null;
  notify?: boolean;
}): Promise<{ ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch: { status?: PurchaseInquiryStatus; admin_note?: string | null } = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.admin_note !== undefined) patch.admin_note = input.admin_note;
  if (Object.keys(patch).length === 0) return { ok: true };
  // Idempotent: writing the same status again is a no-op update.
  const { error } = await supabaseAdmin
    .from("purchase_inquiries")
    .update(patch as never)
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  if (input.status === "paid" && input.notify) {
    try {
      await sendPaymentReceived(await fetchInquiry(input.id));
    } catch (e) {
      console.error("[email] payment received notice failed", e);
    }
  }
  return { ok: true };
}