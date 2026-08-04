import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { REFUND_COPY } from "@/content/legal";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";

const URL = `${SITE_URL}/en/refund-policy`;

export const Route = createFileRoute("/en/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund policy — PFA" },
      {
        name: "description",
        content:
          "Refund terms for PFA digital products: the 14-day right of withdrawal, exceptions for consumed digital content, and how to request a refund.",
      },
      { property: "og:title", content: "Refund policy — PFA" },
      { property: "og:description", content: "Refund terms for PFA digital products." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/refund-policy")],
  }),
  component: () => <LegalPage copy={REFUND_COPY.en} />,
});