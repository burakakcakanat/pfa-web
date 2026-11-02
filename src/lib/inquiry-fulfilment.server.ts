// Server-only: one-tap fulfilment of a paid bank-transfer sales request.
//
// Reuses the existing catalogue: a selection is either a single product or an
// existing bundle, and every component of it becomes a user_entitlements row.
// No parallel discount or order-line system is introduced here.
//
// Idempotency: each granted entitlement carries metadata.inquiry_id. Before
// granting we read what already exists for that (inquiry, type) pair, so
// pressing the button twice grants nothing new.
import type {
  AdminPurchaseInquiryRow,
  GrantedLog,
  GrantedLogEntry,
} from "@/lib/purchase-inquiries";
import { entitlementTypeForSlug, type EntitlementTypeName } from "@/lib/offers";

export type FulfilSelection = {
  fulfil_kind: "product" | "bundle";
  fulfil_slug: string;
  fulfil_book_lang: "tr" | "en";
};

const TYPE_LABEL_TR: Record<string, string> = {
  ebook: "Adınıza imzalı dijital kitap (PDF + EPUB)",
  assessment_full: "Tam PFA Bilinç Seviyeleri Ölçeği + bilinç seviyesi raporu",
  session: "Birebir danışmanlık oturumu (1 seans hakkı)",
  webinar_bsc: "Bilinç Seviyeleri Çalışmaları",
  pfa_pro: "PFA-Pro lisansı",
};

const TYPE_LABEL_EN: Record<string, string> = {
  ebook: "Digital copy signed to your name (PDF + EPUB)",
  assessment_full: "Full PFA Assessment + consciousness-level report",
  session: "One-to-one session (1 session credit)",
  webinar_bsc: "Levels of Consciousness workshop",
  pfa_pro: "PFA-Pro licence",
};

/** Every product slug a selection delivers. */
export async function selectionComponentSlugs(sel: FulfilSelection): Promise<string[]> {
  if (sel.fulfil_kind === "product") return [sel.fulfil_slug];
  const { loadBundle, bundleComponentSlugs } = await import("@/lib/offers.server");
  const b = await loadBundle(sel.fulfil_slug);
  if (!b) throw new Error(`Paket bulunamadı: ${sel.fulfil_slug}`);
  return bundleComponentSlugs(b, sel.fulfil_book_lang);
}

/** Price of a selection in cents (bundle price for bundles, list price for products). */
export async function selectionPriceCents(sel: FulfilSelection): Promise<number> {
  const { loadBundle, bundlePriceCents, priceMapFor } = await import("@/lib/offers.server");
  if (sel.fulfil_kind === "bundle") {
    const b = await loadBundle(sel.fulfil_slug);
    if (!b) return 0;
    const { bundle } = await bundlePriceCents(b, sel.fulfil_book_lang);
    return bundle;
  }
  const prices = await priceMapFor([sel.fulfil_slug]);
  return prices[sel.fulfil_slug] ?? 0;
}

export async function fulfilPurchaseInquiry(input: FulfilSelection & {id:string;notify?:boolean}) {
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {data:locked,error}=await db.rpc('acquire_transfer_fulfil_lock',{inquiry_uuid:input.id});
  if(error || !locked) throw new Error('Teslimat şu anda işleniyor; lütfen daha sonra tekrar deneyin.');
  try {
    const {data:inq}=await db.from('purchase_inquiries').select('user_id,quote,fulfil_kind,fulfil_slug,fulfil_book_lang,transfer_amount,status,payment_reported_at,product_slug').eq('id',input.id).single();
    if(!inq || inq.status==='closed')throw new Error('Talep kapalı veya bulunamadı.');
    if(inq.user_id && inq.quote){
      if(input.fulfil_kind!==inq.fulfil_kind || input.fulfil_slug!==inq.fulfil_slug || input.fulfil_book_lang!==inq.fulfil_book_lang)throw new Error('Müşterinin onayladığı ürün değiştirilemez; yeni talep oluşturun.');
      if(!inq.transfer_amount)throw new Error('Önce ödeme talimatı ve tutarı oluşturun.');
      const {quoteTransfer}=await import('@/lib/transfer.server');
      const current=await quoteTransfer(input.fulfil_slug,input.fulfil_kind,input.fulfil_book_lang,inq.user_id);
      if(!current.ready)throw new Error(current.reason??'Teslimat hazır değil.');
    }
    await db.from('purchase_inquiries').update({status:'paid',delivery_error:null}).eq('id',input.id);
    const result=await fulfilUnlocked(input);
    await db.from('purchase_inquiries').update({delivery_email_sent:result.emailed,delivery_error:result.emailed?null:'Teslim e-postası gönderilemedi; yeniden deneyin.'}).eq('id',input.id);
    const {data:row}=await db.from('purchase_inquiries').select('user_id,product_slug,quote').eq('id',input.id).single();
    if(row?.user_id && row.quote){const quote=row.quote as unknown as {waitlistId?:string};if(quote.waitlistId)await db.from('book_waitlist').update({status:'converted'}).eq('id',quote.waitlistId).eq('user_id',row.user_id);}
    return result;
  } catch(e){await db.from('purchase_inquiries').update({delivery_error:e instanceof Error?e.message:'Teslimat tamamlanamadı.'}).eq('id',input.id);throw e;}
  finally{await db.from('purchase_inquiries').update({fulfil_lock_until:null}).eq('id',input.id);}
}

async function fulfilUnlocked(
  input: FulfilSelection & { id: string; notify?: boolean },
): Promise<{
  ok: boolean;
  granted: GrantedLog;
  pending_account: boolean;
  emailed: boolean;
  already: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inqRow, error: inqErr } = await supabaseAdmin
    .from("purchase_inquiries")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (inqErr) throw new Error(inqErr.message);
  if (!inqRow) throw new Error("Talep bulunamadı");
  const inq = inqRow as unknown as AdminPurchaseInquiryRow;

  const sel: FulfilSelection = {
    fulfil_kind: input.fulfil_kind,
    fulfil_slug: input.fulfil_slug,
    fulfil_book_lang: input.fulfil_book_lang,
  };
  const slugs = await selectionComponentSlugs(sel);
  const email = inq.email.toLowerCase();

  // Match the buyer by e-mail. No account → hold the grant (claimed on signup).
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq(inq.user_id ? "id" : "email", inq.user_id ?? email)
    .maybeSingle();
  const userId = (prof?.id as string | undefined) ?? null;
  const pendingAccount = !userId;

  // ---- what already exists for this inquiry (idempotency) ----
  const existingTypes = new Set<string>();
  if (userId) {
    const { data: ents } = await supabaseAdmin
      .from("user_entitlements")
      .select("id, type, metadata")
      .eq("user_id", userId);
    for (const e of ents ?? []) {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      if (meta.inquiry_id === inq.id) existingTypes.add(`${e.type}:${meta.product_slug ?? ""}`);
    }
  } else {
    const { data: pend } = await supabaseAdmin
      .from("pending_entitlement_grants")
      .select("entitlement_type, metadata")
      .eq("inquiry_id", inq.id);
    for (const p of pend ?? []) {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      existingTypes.add(`${p.entitlement_type}:${meta.product_slug ?? ""}`);
    }
  }

  const entries: GrantedLogEntry[] = [];
  let already = 0;

  // ---- gift: signed e-book goes to a recipient via the existing gift-claim flow ----
  const inqMeta = (inq.metadata ?? {}) as Record<string, unknown>;
  const isGift = inqMeta.is_gift === true;
  const giftSlugs = new Set<string>();
  let giftEmailed = false;
  if (isGift) {
    for (const slug of slugs) if (entitlementTypeForSlug(slug) === "ebook") giftSlugs.add(slug);
    if (giftSlugs.size > 0 && !userId) {
      throw new Error(
        "Hediye için alıcı değil, satın alan kişinin hesabı gerekli. Talep e-postasıyla bir hesap açılmasını isteyin, sonra tekrar deneyin.",
      );
    }
    for (const slug of giftSlugs) {
      const r = await fulfilGift(inq, inqMeta, userId as string, slug, input.notify !== false);
      if (r.already) already++;
      if (r.emailed) giftEmailed = true;
      entries.push({ type: "ebook_gift", slug });
    }
  }

  for (const slug of slugs) {
    if (giftSlugs.has(slug)) continue;
    const type = entitlementTypeForSlug(slug) as EntitlementTypeName | null;
    if (!type) continue;
    const key = `${type}:${slug}`;
    if (existingTypes.has(key)) {
      already++;
      if(type==='ebook' && userId){
        const {data:ents}=await supabaseAdmin.from('user_entitlements').select('id,metadata').eq('user_id',userId).eq('type','ebook');
        const ent=(ents??[]).find(e=>(e.metadata as Record<string,unknown>)?.inquiry_id===inq.id && (e.metadata as Record<string,unknown>)?.product_slug===slug);
        if(ent){const {ensurePersonalizedPdf}=await import('@/lib/ebooks.functions');await ensurePersonalizedPdf({entitlementId:ent.id,slug,existingPath:null,fullName:inq.full_name,email,giftNote:null,buyerName:null});}
      }
      entries.push({ type, slug, ...(pendingAccount ? { pending_account: true } : {}) });
      continue;
    }

    const metadata: Record<string, unknown> = {
      product_slug: slug,
      inquiry_id: inq.id,
      source: "bank_transfer",
      ...(sel.fulfil_kind === "bundle" ? { bundle_slug: sel.fulfil_slug } : {}),
    };
    if (type === "ebook") {
      metadata.recipient_name = inq.full_name;
      metadata.recipient_email = email;
      metadata.is_gift = false;
    }
    if (type === "pfa_pro") {
      metadata.client_quota = 20;
      metadata.client_used = 0;
    }

    if (userId) {
      const { data: ins, error } = await supabaseAdmin
        .from("user_entitlements")
        .insert({ user_id: userId, type, metadata } as never)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      const entId = (ins?.id as string | undefined) ?? undefined;
      entries.push({ type, slug, ...(entId ? { entitlement_id: entId } : {}) });

      if (type === "ebook" && entId) {
        // Signed PDF: same generator the Stripe path uses. A failure here is not
        // fatal — the admin "Bekleyen Kişisel PDF'leri Üret" tool retries.
        try {
          const { ensurePersonalizedPdf } = await import("@/lib/ebooks.functions");
          await ensurePersonalizedPdf({
            entitlementId: entId,
            slug,
            existingPath: null,
            fullName: inq.full_name || (prof?.full_name as string | null) || email,
            email,
            giftNote: null,
            buyerName: null,
          });
        } catch (e) {
          throw new Error("Kişisel PDF üretilemedi; teslimatı yeniden deneyin.");
        }
      }
      if (type === "pfa_pro") {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "pro" } as never, { onConflict: "user_id,role" });
      }
    } else {
      const { error } = await supabaseAdmin.from("pending_entitlement_grants").insert({
        email,
        entitlement_type: type,
        metadata,
        inquiry_id: inq.id,
      } as never);
      if (error) throw new Error(error.message);
      entries.push({ type, slug, pending_account: true });
    }
    existingTypes.add(key);
  }

  const log: GrantedLog = {
    at: new Date().toISOString(),
    selection: {
      kind: sel.fulfil_kind,
      slug: sel.fulfil_slug,
      book_lang: sel.fulfil_book_lang,
    },
    user_id: userId,
    email,
    entries,
    pending_account: pendingAccount,
  };

  const { error: upErr } = await supabaseAdmin
    .from("purchase_inquiries")
    .update({
      status: pendingAccount ? "paid" : "fulfilled",
      fulfil_kind: sel.fulfil_kind,
      fulfil_slug: sel.fulfil_slug,
      fulfil_book_lang: sel.fulfil_book_lang,
      granted: log,
      fulfilled_at: log.at,
    } as never)
    .eq("id", inq.id);
  if (upErr) throw new Error(upErr.message);

  let emailed = giftEmailed;
  if (input.notify !== false && entries.some((e) => e.type !== "ebook_gift")) {
    try {
      emailed = await sendDeliveryEmail(inq, log);
    } catch (e) {
      console.error("[fulfil] delivery e-mail failed", e);
    }
  }

  return { ok: true, granted: log, pending_account: pendingAccount, emailed, already };
}

async function sendDeliveryEmail(
  inq: AdminPurchaseInquiryRow,
  log: GrantedLog,
): Promise<boolean> {
  const { sendEmail } = await import("@/lib/email/send.server");
  const { renderEmail, esc } = await import("@/lib/email/templates");
  const en = inq.locale === "en";
  const firstName = inq.full_name.trim().split(/\s+/)[0] || inq.full_name;
  const labels = en ? TYPE_LABEL_EN : TYPE_LABEL_TR;
  const items = log.entries
    .map((e) => `<li>${esc(labels[e.type] ?? e.type)}</li>`)
    .join("");
  const hasSession = log.entries.some((e) => e.type === "session");

  const body = en
    ? `
      <p>Hello ${esc(firstName)},</p>
      <p>Your payment has been received and everything below is now on your account.</p>
      <ul style="font-size:14px;line-height:1.7">${items}</ul>
      ${
        log.pending_account
          ? `<p>We could not find an account for <strong>${esc(
              log.email,
            )}</strong> yet. Create one with exactly this e-mail address and your access appears automatically.</p>`
          : `<p>You can reach all of it from your account page.</p>`
      }
      ${
        hasSession
          ? `<p>Your session credit is ready: choose a preferred time under “Seanslarım” in your account. We confirm the appointment by e-mail — nothing is booked automatically.</p>`
          : ""
      }
      <p>Warm regards,<br/>The PFA team</p>`
    : `
      <p>Merhaba ${esc(firstName)},</p>
      <p>Ödemeniz alındı; aşağıdakilerin tamamı hesabınıza tanımlandı.</p>
      <ul style="font-size:14px;line-height:1.7">${items}</ul>
      ${
        log.pending_account
          ? `<p><strong>${esc(
              log.email,
            )}</strong> adresine ait bir hesap bulamadık. Tam olarak bu e-posta adresiyle kayıt olduğunuzda haklarınız otomatik olarak hesabınıza geçecek.</p>`
          : `<p>Hepsine hesabım sayfanızdan ulaşabilirsiniz.</p>`
      }
      ${
        hasSession
          ? `<p>Seans hakkınız hazır: hesabınızdaki “Seanslarım” bölümünden tercih ettiğiniz zamanı seçebilirsiniz. Randevu e-posta ile teyit edilir; otomatik onay verilmez.</p>`
          : ""
      }
      <p>Sevgiyle,<br/>PFA Ekibi</p>`;

  const res = await sendEmail({
    to: inq.email,
    replyTo: "info@psychofunctionalanalysis.com",
    subject: en ? "Your purchase is ready — PFA" : "Satın alımınız hazır — PFA",
    html: renderEmail({
      title: en ? "Your purchase is ready" : "Satın alımınız hazır",
      bodyHtml: body,
      ctaLabel: en ? "Go to my account" : "Hesabıma git",
      ctaHref: "https://psychofunctionalanalysis.com/hesabim",
    }),
  });
  return res.ok;
}


/**
 * Gift path for a bank-transfer e-book: records a paid manual order so the
 * existing paid-order trigger creates the gift + claim token (same as card),
 * then e-mails the recipient the claim link. Idempotent per (inquiry, slug).
 */
async function fulfilGift(
  inq: AdminPurchaseInquiryRow,
  meta: Record<string, unknown>,
  buyerId: string,
  slug: string,
  notify: boolean,
): Promise<{ already: boolean; emailed: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const recipientName = String(meta.recipient_name ?? "").trim();
  const recipientEmail = String(meta.recipient_email ?? "").trim().toLowerCase();
  if (!recipientName || !recipientEmail) throw new Error("Hediye alıcısının adı / e-postası eksik.");

  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("provider", "manual")
    .eq("provider_ref", `inquiry:${inq.id}:${slug}`)
    .maybeSingle();
  // An existing pending order is resumed below; notification can be retried without creating a new gift.

  const { data: prod, error: pErr } = await supabaseAdmin
    .from("products")
    .select("id, name_tr, price_cents")
    .eq("slug", slug)
    .maybeSingle();
  if (pErr || !prod) throw new Error(`Ürün bulunamadı: ${slug}`);

  const amountCents =
    inq.transfer_amount != null ? Math.round(Number(inq.transfer_amount) * 100) : (prod.price_cents ?? 0);
  let order = existing;
  if(!order){
  const { data: createdOrder, error: oErr } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: buyerId,
      product_id: prod.id,
      amount_cents: amountCents,
      currency: (inq.transfer_currency || "TRY").toLowerCase(),
      provider: "manual",
      provider_ref: `inquiry:${inq.id}:${slug}`,
      status: "pending",
      locale: inq.locale,
      metadata: {
        source: "bank_transfer",
        inquiry_id: inq.id,
        is_gift: true,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        gift_note: (meta.gift_note as string | null) ?? null,
      },
    } as never)
    .select("id")
    .single();
  if (oErr || !createdOrder) throw new Error(oErr?.message ?? "Sipariş oluşturulamadı");
    order=createdOrder;
  }
  if(!order)throw new Error('Sipariş bulunamadı.');
  const { error: payErr } = await supabaseAdmin
    .from("orders")
    .update({ status: "paid" } as never)
    .eq("id", order.id);
  if (payErr) throw new Error(payErr.message);

  const { data: gift } = await supabaseAdmin
    .from("ebook_gifts")
    .select("claim_token")
    .eq("order_id", order.id)
    .maybeSingle();
  if (!gift?.claim_token) throw new Error("Hediye kaydı oluşmadı.");
  if (!notify) return { already: !!existing, emailed: false };

  try {
    const { sendEmail } = await import("@/lib/email/send.server");
    const { renderEmail, esc } = await import("@/lib/email/templates");
    const site = "https://psychofunctionalanalysis.com";
    const link = `${site}/hediye/${gift.claim_token}`;
    const note = (meta.gift_note as string | null) ?? "";
    const body = `
      <p>Merhaba ${esc(recipientName.split(/\s+/)[0] || recipientName)},</p>
      <p><strong>${esc(inq.full_name)}</strong> size Burak Akçakanat'ın <strong>${esc(
        (prod.name_tr as string) || slug,
      )}</strong> kitabının adınıza imzalı dijital nüshasını hediye etti.</p>
      ${note ? `<p style="font-style:italic">“${esc(note)}”</p>` : ""}
      <p><a href="${link}">Hediyenizi almak için tıklayın</a>. Bu e-posta adresiyle (${esc(
        recipientEmail,
      )}) hesap açtığınızda kitap hesabınıza iner.</p>`;
    const recipientResult = await sendEmail({
      to: recipientEmail,
      subject: "Size imzalı bir kitap hediye edildi",
      html: renderEmail({ title: "Size bir kitap hediye edildi", bodyHtml: body, ctaLabel: "Hediyemi al", ctaHref: link }),
    });
    // Buyer confirmation
    const buyerResult = await sendEmail({
      to: inq.email,
      subject: "Hediyeniz alıcıya gönderildi",
      html: renderEmail({
        title: "Ödemeniz alındı",
        bodyHtml: `<p>Merhaba ${esc(inq.full_name)},</p><p>Ödemeniz alındı. Hediyeniz <strong>${esc(
          recipientName,
        )}</strong> (${esc(recipientEmail)}) adresine gönderildi. Hediye bağlantısını hesabınızdan da görebilirsiniz.</p>`,
      }),
    });
    return { already: !!existing, emailed: recipientResult.ok && buyerResult.ok };
  } catch (e) {
    console.error("[fulfil] gift e-mail failed", e);
    return { already: false, emailed: false };
  }
}
