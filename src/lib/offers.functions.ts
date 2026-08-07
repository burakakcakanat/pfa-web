import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AddonOffer } from "@/lib/offers";

const schema = z.object({
  product_slug: z.string().trim().min(1).max(120),
  book_lang: z.enum(["tr", "en"]).optional().default("tr"),
  locale: z.enum(["tr", "en"]).optional().default("tr"),
});

/**
 * Public read: resolves the one add-on offer for a product page from the real
 * bundle catalogue. Returns null when no live bundle covers that product.
 */
export const getAddonOffer = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }): Promise<AddonOffer | null> => {
    const { resolveAddonOffer } = await import("@/lib/offers.server");
    return resolveAddonOffer(data.product_slug, data.book_lang, data.locale);
  });
