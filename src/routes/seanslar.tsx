import { createFileRoute } from "@tanstack/react-router";
import { BuyButton } from "@/components/buy-button";
import { PurchaseInquiryForm } from "@/components/purchase-inquiry-form";
import { getPublicPrices } from "@/lib/site-settings.functions";
import { fmtMoney, priceFor, type CurrencyPriceMap } from "@/lib/pricing";

export const Route = createFileRoute("/seanslar")({
  loader: async () => ({
    prices: await getPublicPrices({ data: { slugs: ["danismanlik-oturumu"] } }),
  }),
  head: () => ({
    meta: [
      { title: "Seanslar — Birebir Danışmanlık | PFA" },
      {
        name: "description",
        content:
          "60 dakikalık online birebir PFA danışmanlık oturumları. Europe/Istanbul saati; hafta içi 10:00–18:00.",
      },
      { property: "og:title", content: "Seanslar — PFA" },
      { property: "og:description", content: "Birebir online PFA danışmanlık seansları." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/seanslar" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/seanslar" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Birebir PFA Danışmanlık Seansı",
          serviceType: "Danışmanlık",
          description:
            "60 dakikalık online birebir PFA danışmanlık oturumu. Europe/Istanbul saati; hafta içi 10:00–18:00.",
          url: "https://psychofunctionalanalysis.com/seanslar",
          provider: {
            "@type": "Organization",
            name: "Psiko-Fonksiyonel Analiz (PFA)",
            url: "https://psychofunctionalanalysis.com",
          },
          areaServed: { "@type": "Country", name: "Türkiye" },
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: "https://psychofunctionalanalysis.com/seanslar",
          },
        }),
      },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  // Fiyat product_prices'tan; TR yüzeyde TRY.
  const { prices } = Route.useLoaderData() as { prices: CurrencyPriceMap };
  const sessionPrice = priceFor(prices ?? {}, "danismanlik-oturumu", "try");

  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Seanslar</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Birebir Danışmanlık</h1>
        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          Danışan, harita üzerindeki konumunu gördüğünde gelişimin sorumluluğunu sürdürülebilir
          biçimde almaya başlar. Amaç geçici rahatlama değil; işlevsel farkındalığa sahip, öz
          yeterli bireyler. 60 dakikalık birebir oturumlar online gerçekleşir.
        </p>
      </header>

      <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-lg border border-border">
        <div className="grid gap-px bg-border md:grid-cols-[1fr_1.4fr]">
          <aside className="bg-card p-8">
            <div className="text-xs tracking-[0.25em] text-accent">HİZMET</div>
            <h2 className="mt-3 font-serif text-2xl">Danışmanlık Oturumu</h2>
            <ul className="mt-6 space-y-3 text-sm text-foreground/80">
              <li>• 60 dakika</li>
              <li>• Online (Zoom bağlantısı)</li>
              <li>• Europe/Istanbul saati</li>
            </ul>
            {sessionPrice && (
              <div className="mt-6 border-t border-border pt-6">
                <div className="text-xs tracking-[0.25em] text-muted-foreground">FİYAT</div>
                <div className="mt-2 font-serif text-3xl text-primary">
                  {fmtMoney(sessionPrice.cents, sessionPrice.currency)}
                </div>
              </div>
            )}
          </aside>

          <div className="bg-background p-8">
            <PurchaseInquiryForm
              kind="session"
              productSlug="danismanlik-oturumu"
              productLabel="Birebir Danışmanlık Oturumu"
              askSlot
              offerAddon={false}
              buttonLabel="Havale ile satın al"
              hint="Zaman tercihiniz kesin randevu değildir; sizinle birlikte teyit edilir."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
