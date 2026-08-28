import { createFileRoute } from "@tanstack/react-router";
import { BuyButton } from "@/components/buy-button";
import { getUpcomingWebinarForProduct } from "@/lib/site-settings.functions";
import { formatWebinarPrice } from "@/lib/social-drafts";
import {
  WebinarBanner,
  WebinarShowcaseStrip,
  OtherWebinarsLink,
} from "@/components/webinar-showcase";

export const Route = createFileRoute("/webinarlar/bilinc-seviyeleri")({
  loader: () => getUpcomingWebinarForProduct({ data: { slug: "bilinc-seviyeleri-calismalari" } }),
  head: () => ({
    meta: [
      { title: "Bilinç Seviyeleri Çalışmaları — PFA" },
      {
        name: "description",
        content:
          "Kendi haritanızı okumayı öğreten 4 canlı online oturumluk PFA gelişim programı.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          name: "Bilinç Seviyeleri Çalışmaları",
          description:
            "Kendi haritanızı okumayı öğreten 4 canlı online oturumluk PFA gelişim programı.",
          url: "https://psychofunctionalanalysis.com/webinarlar/bilinc-seviyeleri",
          inLanguage: "tr",
          provider: {
            "@type": "Organization",
            name: "Psiko-Fonksiyonel Analiz (PFA)",
            url: "https://psychofunctionalanalysis.com",
          },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "PT4H",
          },
        }),
      },
    ],
  }),
  component: Page,
});

const PROGRAM = [
  { t: "Harita ve Pusula", d: "Yedi seviyeye giriş, genişleme ve bütünleşme." },
  { t: "Alt Katlar", d: "Beka, duygular ve bellek kayıtları — alarmı tanımak." },
  { t: "Orta Katlar", d: "Akıl ve sevgi — analizden anlama." },
  { t: "Üst Katlar", d: "Yaratıcılık, bilgelik, birlik — ve mini ölçeğinizi birlikte okumak." },
];

const KAZANIMLAR = [
  "Yedi seviyeyi kendi yaşam örneklerinizle eşleyebilmek.",
  "Hangi seviyede takıldığınızı fark edip hangi seviyeden destek alacağınızı bilmek.",
  "Mini PFA Ölçeği sonucunuzu yorumlayabilmek.",
];

function Page() {
  const loaded = Route.useLoaderData() as {
    session: {
      id: string;
      title: string;
      starts_at: string;
      banner_url: string | null;
      target_vertical?: string | null;
    } | null;
    price_cents: number | null;
  };
  const session = loaded?.session ?? null;
  const priceLabel = formatWebinarPrice(loaded?.price_cents);
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <WebinarBanner session={session} />
        <WebinarShowcaseStrip session={session} />
        <div className="text-xs tracking-[0.3em] text-accent">
          KENDİ YOLCULUĞUNUZ İÇİN
        </div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Bilinç Seviyeleri Çalışmaları</h1>
        <p className="mt-3 font-serif text-xl italic text-foreground/70">
          Kendi haritanızı okumayı öğrenin.
        </p>

        <p className="mt-8 leading-relaxed text-foreground/85">
          İç dünyamız dağınık bir yer gibi görünebilir. Bu çalışma, o görüntünün altında
          işleyen düzeni — bilincin yedi işlevsel seviyesini — kendi yaşamınız üzerinden
          okumayı öğretir.
        </p>

        <Section title="Kimin için">
          <p className="text-foreground/85">
            Kendini anlamaya yola çıkmış herkes; terapiden veya koçluktan bağımsız,
            kendi gelişimini kendi eline almak isteyenler.
          </p>
        </Section>

        <Section title="Program">
          <p className="text-sm text-muted-foreground">
            4 canlı online oturum · oturum başı 2 saat · tarihler yönetim panelinden duyurulur.
          </p>
          <ol className="mt-4 space-y-3">
            {PROGRAM.map((p, i) => (
              <li key={p.t} className="rounded-md border border-border bg-card p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-accent">
                  Oturum {i + 1}
                </div>
                <div className="mt-1 font-serif text-lg">{p.t}</div>
                <div className="mt-1 text-sm text-foreground/80">{p.d}</div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Kazanımlar">
          <ul className="list-disc space-y-2 pl-5 text-foreground/85">
            {KAZANIMLAR.map((k) => <li key={k}>{k}</li>)}
          </ul>
        </Section>

        <Section title="Format">
          <p className="text-foreground/85">
            Canlı online (katılım bağlantısı e-posta ile), kayıtlar sonradan izlenebilir.
          </p>
        </Section>

        <div className="mt-10 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card p-6">
          <div className="font-serif text-4xl">{priceLabel}</div>
          <BuyButton productSlug="bilinc-seviyeleri-calismalari" label="Kayıt Ol" />
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Not: Bu çalışma klinik bir terapi programı değildir; işlevsel farkındalık için bir
          gelişim programıdır.
        </p>
        <div><OtherWebinarsLink /></div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
