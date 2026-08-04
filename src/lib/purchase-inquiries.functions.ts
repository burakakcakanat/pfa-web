import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";
import {
  purchaseInquiryPatchSchema,
  purchaseInquirySchema,
  type AdminPurchaseInquiryRow,
} from "@/lib/purchase-inquiries";

// Public: honeypot `website_hp` must be empty; rate limited per e-mail and per IP.
export const submitPurchaseInquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => parseFriendly(purchaseInquirySchema, d))
  .handler(async ({ data }) => {
    const { createPurchaseInquiry } = await import("@/lib/purchase-inquiries.server");
    return createPurchaseInquiry(data);
  });

export const listAdminPurchaseInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPurchaseInquiryRow[]> => {
    const { assertPurchaseAdmin, fetchAdminPurchaseInquiries } = await import(
      "@/lib/purchase-inquiries.server"
    );
    await assertPurchaseAdmin(context.supabase, context.userId);
    return fetchAdminPurchaseInquiries();
  });

export const updateAdminPurchaseInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => purchaseInquiryPatchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { assertPurchaseAdmin, patchAdminPurchaseInquiry } = await import(
      "@/lib/purchase-inquiries.server"
    );
    await assertPurchaseAdmin(context.supabase, context.userId);
    return patchAdminPurchaseInquiry(data);
  });