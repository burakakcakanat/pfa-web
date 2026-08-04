import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Product slug → user-facing label for the account page.
const EBOOK_LABELS: Record<string, string> = {
  "pfa-ebook-tr": "PFA: Bilinç Çözümleme (TR)",
  "pfa-ebook-en": "Psycho-Functional Analysis (EN)",
  "hcd-ebook-en": "Human Consciousness Decoded (EN)",
};

function localeFor(slug: string): "tr" | "en" {
  return slug.endsWith("-tr") ? "tr" : "en";
}

async function signedStorageUrl(
  path: string,
  mode: "view" | "download",
  filename: string,
  bucket: "ebooks" | "book-files" = "ebooks",
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: signed, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10, mode === "download" ? { download: filename } : undefined);
  if (error) {
    console.error("[EBOOK_SIGN_FAIL]", { bucket, path, message: error.message });
    throw new Error("Dosya bağlantısı oluşturulamadı. [EBOOK_SIGN_FAIL]");
  }
  return signed?.signedUrl ?? null;
}

// Ürün master dosya yollarını (varsa) döner. Öncelik: products.master_*_path.
async function getMasterPaths(slug: string): Promise<{ pdfPath: string | null; epubPath: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("products")
    .select("master_pdf_path, master_epub_path")
    .eq("slug", slug)
    .maybeSingle();
  return {
    pdfPath: data?.master_pdf_path ?? null,
    epubPath: data?.master_epub_path ?? null,
  };
}

export async function ensurePersonalizedPdf(opts: {
  entitlementId: string;
  slug: string;
  existingPath: string | null;
  fullName: string;
  email: string;
  giftNote?: string | null;
  buyerName?: string | null;
}): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Zaten oluşturulmuşsa ve dosya duruyorsa onu döndür.
  if (opts.existingPath) {
    const [dir, name] = opts.existingPath.split(/\/(?=[^/]+$)/);
    const { data: chk } = await supabaseAdmin.storage.from("ebooks").list(dir, {
      limit: 100,
      search: name,
    });
    if ((chk ?? []).some((f) => f.name === name)) return opts.existingPath;
  }

  // Master PDF önceliği: products.master_pdf_path (book-files bucket) → ebooks/<slug>/ listeleme fallback.
  const masterPaths = await getMasterPaths(opts.slug);
  let masterBytes: Uint8Array | null = null;
  if (masterPaths.pdfPath) {
    const { data: mb } = await supabaseAdmin.storage.from("book-files").download(masterPaths.pdfPath);
    if (mb) masterBytes = new Uint8Array(await mb.arrayBuffer());
  }
  if (!masterBytes) {
    const { data: masterList } = await supabaseAdmin.storage.from("ebooks").list(opts.slug, {
      limit: 20,
    });
    const masterPdf = (masterList ?? []).find((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (masterPdf) {
      const { data: mb } = await supabaseAdmin.storage
        .from("ebooks")
        .download(`${opts.slug}/${masterPdf.name}`);
      if (mb) masterBytes = new Uint8Array(await mb.arrayBuffer());
    }
  }
  if (!masterBytes) return null;

  const locale = localeFor(opts.slug);
  const { data: tpl } = await supabaseAdmin
    .from("ebook_dedication_templates")
    .select("body_template, footer_template, signature_path, author_name")
    .eq("locale", locale)
    .maybeSingle();
  if (!tpl) return null;

  // İmza görseli (varsa).
  let signatureBytes: Uint8Array | null = null;
  if (tpl.signature_path) {
    const { data: sigBlob } = await supabaseAdmin.storage
      .from("ebooks")
      .download(tpl.signature_path);
    if (sigBlob) signatureBytes = new Uint8Array(await sigBlob.arrayBuffer());
  }

  const { generatePersonalizedPdf } = await import("@/lib/personalized-pdf.server");
  const pdfBytes = await generatePersonalizedPdf({
    masterPdfBytes: masterBytes,
    fullName: opts.fullName || opts.email,
    email: opts.email,
    dedicationBody: tpl.body_template,
    footerTemplate: tpl.footer_template,
    authorName: tpl.author_name ?? "Burak Akçakanat",
    signatureBytes,
    giftNote: opts.giftNote ?? null,
    buyerName: opts.buyerName ?? null,
    locale,
  });

  const path = `personalized/${opts.entitlementId}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("ebooks")
    .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) return null;

  // Metadataya kaydet.
  const { data: cur } = await supabaseAdmin
    .from("user_entitlements")
    .select("metadata")
    .eq("id", opts.entitlementId)
    .maybeSingle();
  const meta = { ...((cur?.metadata as Record<string, unknown>) ?? {}), personalized_pdf_path: path };
  await supabaseAdmin
    .from("user_entitlements")
    .update({ metadata: meta })
    .eq("id", opts.entitlementId);

  return path;
}

// List every ebook the signed-in user has bought, with a label and whether
// the admin has uploaded the file yet.
export const listMyEbooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ents } = await supabase
      .from("user_entitlements")
      .select("id, metadata, created_at")
      .eq("user_id", userId)
      .eq("type", "ebook")
      .order("created_at", { ascending: false });

    const rows = ents ?? [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Dedupe by slug (bir kullanıcı aynı kitabı birden fazla siparişte alabilir).
    const seen = new Set<string>();
    const out: Array<{
      entitlement_id: string;
      slug: string;
      label: string;
      available: boolean;
      personalized_ready: boolean;
      recipient_name: string | null;
      is_gift: boolean;
    }> = [];
    for (const r of rows) {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const slug = (meta.product_slug as string | undefined) ?? "pfa-ebook-tr";
      if (seen.has(slug)) continue;
      seen.add(slug);
      const masterPaths = await getMasterPaths(slug);
      let hasMaster = Boolean(masterPaths.pdfPath || masterPaths.epubPath);
      if (!hasMaster) {
        const { data: list } = await supabaseAdmin.storage.from("ebooks").list(slug, { limit: 20 });
        hasMaster = (list ?? []).some((f) => /\.(pdf|epub)$/i.test(f.name));
      }
      const locale = localeFor(slug);
      const { data: tpl } = await supabaseAdmin
        .from("ebook_dedication_templates")
        .select("signature_path")
        .eq("locale", locale)
        .maybeSingle();
      const personalized_ready =
        Boolean(meta.personalized_pdf_path) ||
        (hasMaster && Boolean(tpl?.signature_path));
      out.push({
        entitlement_id: r.id as string,
        slug,
        label: EBOOK_LABELS[slug] ?? slug,
        available: hasMaster,
        personalized_ready,
        recipient_name: (meta.recipient_name as string | undefined) ?? null,
        is_gift: Boolean(meta.is_gift),
      });
    }
    return out;
  });

// Returns a signed URL for a specific ebook the user owns. `mode` = "view"
// opens in-browser (PDF viewer), "download" forces a file download.
export const getEbookUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: z.string(),
        mode: z.enum(["view", "download"]).default("view"),
        format: z.enum(["pdf", "epub"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const traceId = crypto.randomUUID().slice(0, 8);
    console.info("[EBOOK_URL_START]", { traceId, slug: data.slug, mode: data.mode, format: data.format ?? "pdf" });
    // Aynı kitap birden fazla siparişte alınmış olabilir; maybeSingle() bu durumda
    // hata döndürüp yetki hatasına yol açıyordu. Tüm hakları çekip
    // kişiselleştirilmiş dosyası olanı (yoksa en yenisini) seçiyoruz.
    const { data: ents, error: entitlementError } = await supabase
      .from("user_entitlements")
      .select("id, metadata, created_at")
      .eq("user_id", userId)
      .eq("type", "ebook")
      .order("created_at", { ascending: false });
    if (entitlementError) {
      console.error("[EBOOK_ENT_QUERY]", { traceId, code: entitlementError.code, message: entitlementError.message });
      throw new Error("E-kitap yetkisi doğrulanamadı. [EBOOK_ENT_QUERY]");
    }
    // Liste görünümü eski haklarda eksik product_slug değerini Türkçe PFA kitabı
    // olarak yorumluyor. Yetki kontrolü de aynı çözümlemeyi kullanmalı.
    const rows = (ents ?? []).filter((row) => {
      const rowMeta = (row.metadata ?? {}) as Record<string, unknown>;
      const rowSlug = (rowMeta.product_slug as string | undefined) ?? "pfa-ebook-tr";
      return rowSlug === data.slug;
    });
    console.info("[EBOOK_ENT_COUNT]", { traceId, count: rows.length });
    const ent =
      rows.find((r) => Boolean((r.metadata as Record<string, unknown> | null)?.personalized_pdf_path)) ??
      rows[0];
    if (!ent) {
      console.warn("[EBOOK_ENT_MISSING]", { traceId, slug: data.slug });
      throw new Error("Bu e-kitap için yetkiniz bulunmuyor. [EBOOK_ENT_MISSING]");
    }

    const meta = (ent.metadata ?? {}) as Record<string, unknown>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const masterPaths = await getMasterPaths(data.slug);

    // EPUB açıkça istendiyse (veya format belirtilmemiş + indir modu eski davranış) EPUB'u ver.
    const wantEpub = data.format === "epub";
    if (wantEpub) {
      if (masterPaths.epubPath) {
        const filename = `${data.slug}.epub`;
        const url = await signedStorageUrl(masterPaths.epubPath, "download", filename, "book-files");
        if (url) return { url, filename, personalized: false };
      }
      const { data: list } = await supabaseAdmin.storage.from("ebooks").list(data.slug, {
        limit: 20,
      });
      const epub = (list ?? []).find((f) => f.name.toLowerCase().endsWith(".epub"));
      if (epub) {
        const url = await signedStorageUrl(`${data.slug}/${epub.name}`, "download", epub.name);
        if (url) return { url, filename: epub.name, personalized: false };
      }
      console.warn("[EBOOK_FILE_MISSING]", { traceId, slug: data.slug, format: "epub" });
      return { url: null, filename: null, personalized: false, errorCode: "EBOOK_FILE_MISSING" };
    }

    // View veya EPUB yoksa → kişiselleştirilmiş PDF (yoksa üret).
    const { data: prof, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      console.error("[EBOOK_PROFILE_QUERY]", { traceId, code: profileError.code, message: profileError.message });
      throw new Error("Hesap bilgileri doğrulanamadı. [EBOOK_PROFILE_QUERY]");
    }

    const fullName =
      (meta.recipient_name as string | undefined) || prof?.full_name || prof?.email || "";
    const email = (meta.recipient_email as string | undefined) || prof?.email || "";

    let buyerName: string | null = null;
    if (meta.is_gift && meta.gift_from) {
      const { data: buyer } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", meta.gift_from as string)
        .maybeSingle();
      buyerName = buyer?.full_name ?? null;
    }

    const path = await ensurePersonalizedPdf({
      entitlementId: ent.id as string,
      slug: data.slug,
      existingPath: (meta.personalized_pdf_path as string | undefined) ?? null,
      fullName,
      email,
      giftNote: (meta.gift_note as string | undefined) ?? null,
      buyerName,
    });

    if (path) {
      console.info("[EBOOK_PERSONALIZED]", { traceId, source: "personalized" });
      const filename = `${data.slug}-imzali.pdf`;
      const url = await signedStorageUrl(
        path,
        data.mode,
        filename,
      );
      if (url) return { url, filename, personalized: true };
    }

    // Kişiselleştirme henüz mümkün değil (imza veya master eksik) →
    // standart PDF varsa onu ver. Öncelik: products.master_pdf_path.
    if (masterPaths.pdfPath) {
      const filename = `${data.slug}.pdf`;
      const url = await signedStorageUrl(masterPaths.pdfPath, data.mode, filename, "book-files");
      if (url) return { url, filename, personalized: false };
    }
    const { data: list } = await supabaseAdmin.storage.from("ebooks").list(data.slug, {
      limit: 20,
    });
    const pdf = (list ?? []).find((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdf) {
      const url = await signedStorageUrl(`${data.slug}/${pdf.name}`, data.mode, pdf.name);
      if (url) return { url, filename: pdf.name, personalized: false };
    }
    console.warn("[EBOOK_FILE_MISSING]", { traceId, slug: data.slug, format: data.format ?? "pdf" });
    return { url: null, filename: null, personalized: false, errorCode: "EBOOK_FILE_MISSING" };
  });
