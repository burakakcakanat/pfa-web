import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";
import {
  bankTransferDetailsSchema,
  purchaseInquiryPatchSchema,
  purchaseInquirySchema,
  sendTransferInstructionsSchema,
  type AdminPurchaseInquiryRow,
  type BankTransferDetails,
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

// Bank details: admin-asserted read/write only. The underlying table has RLS on
// with zero policies and no anon/authenticated grants, so no browser client can
// read the IBAN — only these service-role paths after an admin check.
export const getBankTransferDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BankTransferDetails> => {
    const { assertPurchaseAdmin, fetchBankTransferDetails } = await import(
      "@/lib/purchase-inquiries.server"
    );
    await assertPurchaseAdmin(context.supabase, context.userId);
    return fetchBankTransferDetails();
  });

export const saveBankTransferDetailsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bankTransferDetailsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { assertPurchaseAdmin, saveBankTransferDetails } = await import(
      "@/lib/purchase-inquiries.server"
    );
    await assertPurchaseAdmin(context.supabase, context.userId);
    return saveBankTransferDetails(data);
  });

export const sendTransferInstructionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendTransferInstructionsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { assertPurchaseAdmin, sendTransferInstructions } = await import(
      "@/lib/purchase-inquiries.server"
    );
    await assertPurchaseAdmin(context.supabase, context.userId);
    return sendTransferInstructions(data);
  });