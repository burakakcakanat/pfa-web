import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicPrices, getUpcomingWebinarForProduct } from "@/lib/site-settings.functions";
import { fmtMoney, priceFor, type CurrencyPriceMap } from "@/lib/pricing";
import { WebinarShowcaseStrip } from "@/components/webinar-showcase";

export const Route = createFileRoute("/webinarlar/")({
  loader: async () => {
    const [bsc, pro, prices] = await Promise.all([
      getUpcomingWebinarForProduct({ data: { slug: "bilinc-seviyeleri-calismalari" } }),
      getUpcomingWebinarForProduct({ data: { slug: "pfa-pro-lisans-paketi" } }),
      getPublicPrices({
        data: { slugs: ["bilinc-seviyeleri-calismalari", "pfa-pro-lisans-paketi"] },
      }),
    ]);
    return { bsc, pro, prices };
  },
  head: () => ({
    meta: [
      { title: "Webinarlar — PFA" },
      {
        name: "description",
        content:
          "PFA webinar programları: Bilinç Seviyeleri Çalışmaları ve PFA-Pro Uygulayıcı Lisans Paketi.",
      },
      { property: "og:title", content: "Webinarlar — PFA" },
      { property: "og:description", content: "PFA webinar programları." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/webinarlar" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/webinarlar" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "PFA Webinar Programları",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              item: {
                "@type": "Course",
                name: "Bilinç Seviyeleri Çalışmaları",
                description: "Kendi haritanızı okumayı öğreten canlı online PFA gelişim programı.",
                url: "https://psychofunctionalanalysis.com/webinarlar/bilinc-seviyeleri",
                inLanguage: "tr",
                provider: {
                  "@type": "Organization",
                  name: "Psiko-Fonksiyonel Analiz (PFA)",
                  url: "https://psychofunctionalanalysis.com",
                },
              },
            },
            {
              "@type": "ListItem",
              position: 2,
              item: {
                "@type": "Course",
                name: "PFA-Pro Uygulayıcı Lisans Paketi",
                description: "PFA'yı danışanlarınızla uygulamak için eğitim, lisans ve araçlar.",
                url: "https://psychofunctionalanalysis.com/webinarlar/pfa-pro",
                inLanguage: "tr",
                provider: {
                  "@type": "Organization",
                  name: "Psiko-Fonksiyonel Analiz (PFA)",
                  url: "https://psychofunctionalanalysis.com",
                },
              },
            },
          ],
        }),
      },
    ],
  }),
  component: WebinarsPage,
});

const BLOCKS = [
  {
    badge: "Kendi Yolculuğunuz İçin",
    title: "Bilinç Seviyeleri Çalışmaları",
    subtitle: "Kendi haritanızı okumayı öğrenin.",
    desc:
      "Yedi işlevsel seviyeye giriş; kendi yaşam örnekleriniz üzerinden uygulamalı bir gelişim programı.",
    slug: "bilinc-seviyeleri-calismalari",
    key: "bsc" as const,
    to: "/webinarlar/bilinc-seviyeleri" as const,
  },
  {
    badge: "Profesyonel Uygulama İçin",
    title: "PFA-Pro — Uygulayıcı Lisans Paketi",
    subtitle: "PFA'yı danışanlarınızla uygulamak için eğitim + lisans + araçlar.",
    desc:
      "6 canlı oturum, dijital sertifika, Pro panel ve 20 danışan ölçeği hakkı.",
    slug: "pfa-pro-lisans-paketi",
    key: "pro" as const,
    to: "/webinarlar/pfa-pro" as const,
  },
];

function WebinarsPage() {
  const loaded = Route.useLoaderData() as Record<
    "bsc" | "pro",
    {
      session: {
        id: string;
        title: string;
        starts_at: string;
        banner_url: string | null;
        target_vertical?: string | null;
      } | null;
    }
  >;
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">WEBİNARLAR</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Programlar</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          İki farklı yolculuk: kendi haritanızı okumak ya da modeli danışanlarınızla uygulamak.
        </p>
      </header>

      <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
        {BLOCKS.map((b) => (
          <article
            key={b.title}
            className="flex flex-col rounded-lg border border-border bg-card p-8"
          >
            <WebinarShowcaseStrip session={loaded?.[b.key]?.session ?? null} />
            <div className="text-xs tracking-[0.25em] text-accent">{b.badge.toLocaleUpperCase("tr-TR")}</div>
            <h2 className="mt-4 font-serif text-2xl">{b.title}</h2>
            <p className="mt-2 text-sm italic text-foreground/70">{b.subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">{b.desc}</p>
            <div className="mt-6 flex items-center justify-between">
              <div className="font-serif text-3xl">{"$" + b.price}</div>
              <Link to={b.to} className="btn-primary hover:btn-primary-hover">
                Detay & Kayıt →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
