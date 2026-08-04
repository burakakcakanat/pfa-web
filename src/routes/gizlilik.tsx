import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_COPY } from "@/content/legal";
import { alternateLinks } from "@/lib/i18n";

const URL = "https://psychofunctionalanalysis.com/gizlilik";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik ve KVKK Aydınlatma Metni — PFA" },
      {
        name: "description",
        content:
          "PFA gizlilik politikası ve KVKK aydınlatma metni: işlenen veriler, amaçlar, ölçek sonuçlarının gizliliği, saklama süreleri ve haklarınız.",
      },
      { property: "og:title", content: "Gizlilik ve KVKK Aydınlatma Metni — PFA" },
      { property: "og:description", content: "PFA gizlilik politikası ve KVKK aydınlatma metni." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinks("/gizlilik")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://psychofunctionalanalysis.com/" },
            { "@type": "ListItem", position: 2, name: "Gizlilik", item: URL },
          ],
        }),
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage copy={PRIVACY_COPY.tr} />;
}