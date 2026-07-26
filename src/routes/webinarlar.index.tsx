import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/webinarlar/")({
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
    price: 150,
    to: "/webinarlar/bilinc-seviyeleri" as const,
  },
  {
    badge: "Profesyonel Uygulama İçin",
    title: "PFA-Pro — Uygulayıcı Lisans Paketi",
    subtitle: "PFA'yı danışanlarınızla uygulamak için eğitim + lisans + araçlar.",
    desc:
      "6 canlı oturum, dijital sertifika, Pro panel ve 20 danışan ölçeği hakkı.",
    price: 450,
    to: "/webinarlar/pfa-pro" as const,
  },
];

function WebinarsPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Webinarlar</div>
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
            <div className="text-xs uppercase tracking-[0.25em] text-accent">{b.badge}</div>
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
