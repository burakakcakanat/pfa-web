import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns a signed download URL for the user's PFA e-book, or null if
// the admin has not uploaded a file yet.
export const getEbookDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: ent } = await supabase
      .from("user_entitlements")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("type", "ebook")
      .maybeSingle();
    if (!ent) throw new Error("E-book yetkisi bulunamadı.");

    const slug = (ent.metadata as { product_slug?: string })?.product_slug ?? "pfa-ebook-tr";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.storage.from("ebooks").list(slug, {
      limit: 10,
      sortBy: { column: "updated_at", order: "desc" },
    });
    const file = list?.[0];
    if (!file) return { url: null, filename: null };

    const path = `${slug}/${file.name}`;
    const { data: signed } = await supabaseAdmin.storage
      .from("ebooks")
      .createSignedUrl(path, 60 * 10);
    return { url: signed?.signedUrl ?? null, filename: file.name };
  });
