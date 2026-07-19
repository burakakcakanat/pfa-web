import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Product slug → user-facing label for the account page.
const EBOOK_LABELS: Record<string, string> = {
  "pfa-ebook-tr": "PFA: Bilinç Çözümleme (TR)",
  "pfa-ebook-en": "Psycho-Functional Analysis (EN)",
  "hcd-ebook-en": "Human Consciousness Decoded (EN)",
};

async function signedForSlug(slug: string, mode: "view" | "download") {
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
    .createSignedUrl(path, 60 * 10, mode === "download" ? { download: file.name } : undefined);
  return { url: signed?.signedUrl ?? null, filename: file.name };
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

    // Dedupe by slug (a user may own the same book from multiple orders).
    const seen = new Set<string>();
    const out: Array<{ slug: string; label: string; available: boolean }> = [];
    for (const r of rows) {
      const slug = (r.metadata as { product_slug?: string })?.product_slug ?? "pfa-ebook-tr";
      if (seen.has(slug)) continue;
      seen.add(slug);
      const { data: list } = await supabaseAdmin.storage.from("ebooks").list(slug, { limit: 1 });
      out.push({
        slug,
        label: EBOOK_LABELS[slug] ?? slug,
        available: (list?.length ?? 0) > 0,
      });
    }
    return out;
  });

// Returns a signed URL for a specific ebook the user owns. `mode` = "view"
// opens in-browser (PDF viewer), "download" forces a file download.
export const getEbookUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ slug: z.string(), mode: z.enum(["view", "download"]).default("view") }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: ent } = await supabase
      .from("user_entitlements")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("type", "ebook")
      .filter("metadata->>product_slug", "eq", data.slug)
      .maybeSingle();
    if (!ent) throw new Error("Bu e-book için yetkiniz bulunmuyor.");
    return signedForSlug(data.slug, data.mode);
  });
