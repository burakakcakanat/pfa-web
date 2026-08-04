import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { TERMS_COPY } from "@/content/legal";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";

const URL = `${SITE_URL}/en/terms`;

export const Route = createFileRoute("/en/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — PFA" },
      {
        name: "description",
        content:
          "Terms of use for the PFA site and its digital products: account responsibility, the digital content licence, intellectual property and provision of the service.",
      },
      { property: "og:title", content: "Terms of use — PFA" },
      { property: "og:description", content: "Terms of use for the PFA site and its digital products." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/terms")],
  }),
  component: () => <LegalPage copy={TERMS_COPY.en} />,
});