import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listBooksTool from "./tools/list-books";
import listWebinarsTool from "./tools/list-webinars";
import sessionAvailabilityTool from "./tools/session-availability";
import submitInquiryTool from "./tools/submit-inquiry";
import pfaOverviewTool from "./tools/pfa-overview";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL is
// rewritten to the `.lovable.cloud` proxy, which mcp-js rejects as an RFC 8414
// issuer mismatch. The project ref is the only Supabase value that survives
// publish unchanged, and Vite inlines it as a literal at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";
const issuerUrl = `https://${projectRef}.supabase.co/auth/v1`;

export default defineMcp({
  name: "pfa-mcp",
  title: "Psiko-Fonksiyonel Analiz (PFA)",
  version: "0.1.0",
  auth: auth.oauth.issuer({
    issuer: issuerUrl,
    acceptedAudiences: "authenticated",
    resourceName: "Psiko-Fonksiyonel Analiz (PFA)",
  }),
  instructions:
    "Burak Akçakanat'ın Psiko-Fonksiyonel Analiz (PFA) portalı için araçlar. `pfa_overview` ile başla; kitaplar, webinarlar ve seans müsaitliği için ilgili list/get araçlarını, kullanıcı adına başvuru göndermek için `submit_inquiry` aracını kullan.",
  tools: [
    pfaOverviewTool,
    listBooksTool,
    listWebinarsTool,
    sessionAvailabilityTool,
    submitInquiryTool,
  ],
});