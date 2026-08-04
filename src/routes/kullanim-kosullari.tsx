import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { TERMS_COPY } from "@/content/legal";
import { alternateLinks } from "@/lib/i18n";

const URL = "https://psychofunctionalanalysis.com/kullanim-kosullari";

export const Route = createFileRoute("/kullanim-kosullari")({
  head: () => ({
    meta: [
      { title: "Kullanım Koşulları — PFA" },
      {
        name: "description",
        content:
          "PFA web sitesi ve dijital ürünlerinin kullanım koşulları: hesap sorumluluğu, dijital içerik lisansı, fikrî mülkiyet ve hizmet sürekliliği.",
      },
      { property: "og:title", content: "Kullanım Koşulları — PFA" },
      {
        property: "og:description",
        content: "PFA web sitesi ve dijital ürünlerinin kullanım koşulları.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinks("/kullanim-kosullari")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://psychofunctionalanalysis.com/" },
            { "@type": "ListItem", position: 2, name: "Kullanım Koşulları", item: URL },
          ],
        }),
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage copy={TERMS_COPY.tr} />;
}
