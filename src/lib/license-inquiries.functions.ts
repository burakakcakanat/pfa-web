import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFriendly } from "@/lib/zod-friendly";
import {
  licenseAdminPatchSchema,
  licenseInquirySchema,
  type AdminLicenseInquiryRow,
} from "@/lib/license-inquiries";

// Public: honeypot `website_hp` must be empty; rate limited per e-mail and per IP.
export const submitLicenseInquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => parseFriendly(licenseInquirySchema, d))
  .handler(async ({ data }) => {
    const { createLicenseInquiry } = await import("@/lib/license-inquiries.server");
    return createLicenseInquiry(data);
  });

export const listAdminLicenseInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminLicenseInquiryRow[]> => {
    const { assertLicenseAdmin, fetchAdminLicenseInquiries } = await import(
      "@/lib/license-inquiries.server"
    );
    await assertLicenseAdmin(context.supabase, context.userId);
    return fetchAdminLicenseInquiries();
  });

export const updateAdminLicenseInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => licenseAdminPatchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { assertLicenseAdmin, patchAdminLicenseInquiry } = await import(
      "@/lib/license-inquiries.server"
    );
    await assertLicenseAdmin(context.supabase, context.userId);
    return patchAdminLicenseInquiry(data);
  });
