import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sağlayıcıdan bağımsız checkout. İstemci yalnızca ne satın alındığını söyler;
 * fiyat, paket eşleştirmesi ve indirim sunucuda hesaplanır.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        product_slug: z.string().min(1),
        addon_slugs: z.array(z.string().min(1)).max(6).optional(),
        currency: z.enum(["usd", "try", "eur"]),
        origin: z.string().url(),
        discount_code: z.string().trim().max(64).optional().nullable(),
        gift: z
          .object({
            recipient_name: z.string().trim().min(2).max(120),
            recipient_email: z.string().trim().email().max(255),
            gift_note: z.string().trim().max(200).optional().nullable(),
          })
          .optional()
          .nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { startCheckoutOnServer } = await import("@/lib/checkout.server");
    return startCheckoutOnServer(data, { supabase: context.supabase, userId: context.userId });
  });
