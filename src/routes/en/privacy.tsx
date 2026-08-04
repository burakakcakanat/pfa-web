import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_COPY } from "@/content/legal";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";

const URL = `${SITE_URL}/en/privacy`;

export const Route = createFileRoute("/en/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — PFA" },
      {
        name: "description",
        content:
          "PFA privacy policy: the data we process, why we process it, confidentiality of assessment results, retention, service providers and your rights.",
      },
      { property: "og:title", content: "Privacy policy — PFA" },
      { property: "og:description", content: "How PFA handles personal data and assessment results." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/privacy")],
  }),
  component: () => <LegalPage copy={PRIVACY_COPY.en} />,
});