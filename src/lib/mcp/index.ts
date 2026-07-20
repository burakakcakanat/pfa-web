import { defineMcp } from "@lovable.dev/mcp-js";

import listBooksTool from "./tools/list-books";
import listWebinarsTool from "./tools/list-webinars";
import sessionAvailabilityTool from "./tools/session-availability";
import submitInquiryTool from "./tools/submit-inquiry";
import pfaOverviewTool from "./tools/pfa-overview";

export default defineMcp({
  name: "pfa-mcp",
  title: "Psİko-Fonksİyonel Analİz (PFA)",
  version: "0.1.0",
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