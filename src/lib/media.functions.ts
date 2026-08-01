import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Marka/medya kütüphanesi. SADECE "site-media" kutusunu kullanır.
// Özel "book-files" (satın alınabilir kitap dosyaları, imzalar) ve
// "applicant-docs" kutularına asla erişmez.
const MEDIA_BUCKET = "site-media" as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "svg"] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function publicUrlFor(path: string): string {
  const base = (process.env.SITE_URL || "https://psychofunctionalanalysis.com").replace(/\/$/, "");
  return `${base}/api/public/media/${encodeURIComponent(path)}`;
}

function slugifyName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "gorsel";
  const ext = (dot > 0 ? name.slice(dot + 1) : "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${stem}.${ext || "png"}`;
}

export const listSiteMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data, error }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from("site_media")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("site_settings").select("key, value").eq("key", "newsletter_bg_image_url"),
    ]);
    if (error) throw new Error(error.message);
    const newsletterUrl = (settings ?? []).find((r: any) => r.key === "newsletter_bg_image_url")?.value ?? null;
    return { rows: data ?? [], newsletterUrl };
  });

export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        filename: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().min(3).max(100),
        byteSize: z.number().int().positive(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!ALLOWED_MIME.includes(data.mimeType as any)) {
      throw new Error("Yalnızca PNG, JPG, WEBP ve SVG dosyaları yüklenebilir.");
    }
    const safe = slugifyName(data.filename);
    const ext = safe.split(".").pop() as string;
    if (!ALLOWED_EXT.includes(ext as any)) {
      throw new Error("Geçersiz dosya uzantısı. PNG, JPG, WEBP veya SVG kullanın.");
    }
    if (data.byteSize > MAX_BYTES) {
      throw new Error("Dosya 5 MB sınırını aşıyor. Daha küçük bir sürüm yükleyin.");
    }
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, publicUrl: publicUrlFor(path) };
  });

export const finalizeMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        storagePath: z.string().min(1).max(300),
        originalFilename: z.string().min(1).max(200),
        mimeType: z.string().min(3).max(100),
        byteSize: z.number().int().positive().max(MAX_BYTES),
        width: z.number().int().min(0).max(30000),
        height: z.number().int().min(0).max(30000),
        hasTransparency: z.boolean(),
        label: z.string().trim().max(120).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!ALLOWED_MIME.includes(data.mimeType as any)) throw new Error("Desteklenmeyen dosya türü.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("site_media")
      .insert({
        storage_path: data.storagePath,
        public_url: publicUrlFor(data.storagePath),
        original_filename: data.originalFilename,
        mime_type: data.mimeType,
        byte_size: data.byteSize,
        width: data.width,
        height: data.height,
        has_transparency: data.hasTransparency,
        label: data.label ?? null,
        uploaded_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSiteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().trim().max(120).optional().nullable(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_media")
      .update({ label: data.label ?? null, ...(data.tags ? { tags: data.tags } : {}) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSiteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("site_media")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: true };
    await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
    const { error: delErr } = await supabaseAdmin.from("site_media").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });