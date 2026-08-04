import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { REFUND_COPY } from "@/content/legal";
import { alternateLinks } from "@/lib/i18n";

const URL = "https://psychofunctionalanalysis.com/iade-politikasi";

export const Route = createFileRoute("/iade-politikasi")({
  head: () => ({
    meta: [
      { title: "İade Politikası — PFA" },
      {
        name: "description",
        content:
          "PFA dijital ürünleri için iade koşulları: 14 günlük cayma hakkı, istisnalar ve iade süreci.",
      },
      { property: "og:title", content: "İade Politikası — PFA" },
      {
        property: "og:description",
        content: "PFA dijital ürünleri için iade koşulları.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinks("/iade-politikasi")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://psychofunctionalanalysis.com/" },
            { "@type": "ListItem", position: 2, name: "İade Politikası", item: URL },
          ],
        }),
      },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return <LegalPage copy={REFUND_COPY.tr} />;
}
