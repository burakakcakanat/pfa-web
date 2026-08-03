import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listBooksTool from "./tools/list-books";
import listWebinarsTool from "./tools/list-webinars";
import sessionAvailabilityTool from "./tools/session-availability";
import submitInquiryTool from "./tools/submit-inquiry";
import pfaOverviewTool from "./tools/pfa-overview";

const supabaseUrl = (
  process.env['SUPABASE_URL'] ??
  process.env['VITE_SUPABASE_URL'] ??
  "https://supabase.invalid"
).replace(/\/+$/, "");

export default defineMcp({
  name: "pfa-mcp",
  title: "Psİko-Fonksİyonel Analİz (PFA)",
  version: "0.1.0",
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    acceptedAudiences: "authenticated",
    resourceName: "Psİko-Fonksİyonel Analİz (PFA)",
  }),
  instructions:
    "Burak Akçakanat'ın Psİko-Fonksİyonel Analİz (PFA) portalı için araçlar. `pfa_overview` ile başla; kitaplar, webinarlar ve seans müsaitliği için ilgili list/get araçlarını, kullanıcı adına başvuru göndermek için `submit_inquiry` aracını kullan.",
  tools: [
    pfaOverviewTool,
    listBooksTool,
    listWebinarsTool,
    sessionAvailabilityTool,
    submitInquiryTool,
  ],
});