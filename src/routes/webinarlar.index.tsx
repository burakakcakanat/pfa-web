import { createFileRoute } from "@tanstack/react-router";
import { BuyButton } from "@/components/buy-button";

export const Route = createFileRoute("/webinarlar/")({
  head: () => ({
    meta: [
      { title: "Webinarlar — PFA" },
      {
        name: "description",
        content: "PFA webinarları: yedi bilinç seviyesi ve işlevsel farkındalık atölyeleri.",
      },
    ],
  }),
  component: WebinarsPage,
});

const WEBINARS = [
  {
    slug: "bilinc-seviyeleri-calismalari",
    title: "Yedi Seviyeye Giriş",
    date: "2026-02-14T19:00:00+03:00",
    price: 150,
    capacity: 100,
    desc: "PFA modelinin yedi seviyesine bütünsel bir bakış. Başlangıç düzeyi.",
  },
  {
    slug: "pfa-pro-lisans-paketi",
    title: "İşlevsel Farkındalık Atölyesi",
    date: "2026-03-07T19:00:00+03:00",
    price: 450,
    capacity: 60,
    desc: "Kendi haritanız üzerinde çalıştıran uygulamalı bir seans. Ara düzey.",
  },
];

const fmt = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

function WebinarsPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Webinarlar</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Yaklaşan Webinarlar</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          Kayıt sonrası bağlantı e-posta ile paylaşılır. Tüm saatler Europe/Istanbul.
        </p>
      </header>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6">
        {WEBINARS.map((w) => (
          <article
            key={w.title}
            className="grid gap-6 rounded-lg border border-border bg-card p-8 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-accent">
                {fmt.format(new Date(w.date))}
              </div>
              <h2 className="mt-3 font-serif text-2xl">{w.title}</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">
                {w.desc}
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                Kontenjan: {w.capacity} kişi
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="font-serif text-3xl">${w.price}</div>
              <BuyButton productSlug={w.slug} label="Kayıt Ol" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}