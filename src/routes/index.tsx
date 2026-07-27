import { createFileRoute, Link } from "@tanstack/react-router";
import pfaMapAsset from "@/assets/pfa-map-hero.png.asset.json";
import heroStepsAsset from "@/assets/hero-steps.png.asset.json";
import { INTELLIGENCE_LABEL, LEVEL_LABEL_TR, LEVEL_TO_INTELLIGENCE } from "@/lib/assessment-scoring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PFA — İnsan Bilincinin İşlevsel Haritası" },
      {
        name: "description",
        content:
          "Psİko-Fonksİyonel Analİz, insan bilincini yedi işlevsel seviyeye ayırır — Bekadan Aydınlanmaya uzanan bir harita.",
      },
      { property: "og:title", content: "PFA — İnsan Bilincinin İşlevsel Haritası" },
      { property: "og:description", content: "Psİko-Fonksİyonel Analİz: bilincin yedi seviyeli işlevsel haritası." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Psiko-Fonksiyonel Analiz (PFA)",
          url: "https://psychofunctionalanalysis.com",
          logo: "https://psychofunctionalanalysis.com/favicon.ico",
          founder: { "@type": "Person", name: "Burak Akçakanat" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Psiko-Fonksiyonel Analiz (PFA)",
          url: "https://psychofunctionalanalysis.com",
        }),
      },
    ],
  }),
  component: HomePage,
});

const PATHS = [
  {
    tag: "OKU",
    body: "Bilincin yedi seviyeli haritasını kitaplarla derinlemesine öğrenin.",
    cta: "Kitaplara Git",
    to: "/kitaplar",
  },
  {
    tag: "ÖLÇ",
    body: "PFA Ölçeği, her seviye için 30 soruyla hangi işlevin aksadığını gösterir; farkındalığı işlevsel farkındalığa taşır.",
    cta: "Ölçeği Tanı",
    to: "/degerlendirme",
  },
  {
    tag: "ÇALIŞ",
    body: "Birebir danışmanlık seansları ve webinarlarla harita üzerindeki konumunuzu birlikte çalışalım.",
    cta: "Seans Al",
    to: "/seanslar",
  },
] as const;

function HomePage() {
  const scrollToMap = (e: React.MouseEvent) => {
    e.preventDefault();
    document
      .getElementById("bilinc-haritasi")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Ornament />
        <div className="container-page relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-medium uppercase tracking-[0.35em] text-accent md:text-base">
              Psİko-Fonksİyonel Analİz
            </div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.08] text-foreground md:text-6xl">
              İnsan bilincinin
              <br />
              <em className="not-italic text-accent">işlevsel haritası.</em>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
              PFA, insan bilincini yedi işlevsel seviyeye ayırır — tek bir
              hücrenin hayatta kalma güdüsünden evrensel birlik deneyimine
              dek — ve her birini bir beyin bölgesiyle, bir zekâ türüyle ve
              bir gelişim aşamasıyla eşler.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href="#bilinc-haritasi" onClick={scrollToMap} className="btn-primary hover:btn-primary-hover">
                Haritayı Keşfet
              </a>
              <Link to="/kitaplar" className="btn-outline hover:bg-foreground/5">
                Kitapları İncele
              </Link>
            </div>
            <div className="mx-auto mt-14 flex max-w-md items-center justify-center gap-6 text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
              <span>7 Seviye</span>
              <span className="h-px w-8 bg-border" />
              <span>7 Zekâ</span>
              <span className="h-px w-8 bg-border" />
              <span>Tek Harita</span>
            </div>
          </div>
        </div>
      </section>

      {/* Kime Hitap Eder */}
      <AudienceSection />

      {/* Three paths */}
      <section className="container-page py-14 md:py-16">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {PATHS.map((p) => (
            <div key={p.tag} className="flex flex-col gap-5 bg-background p-8">
              <div className="text-xs tracking-[0.35em] text-accent">{p.tag}</div>
              <p className="flex-1 text-[0.98rem] leading-relaxed text-foreground/85">
                {p.body}
              </p>
              <Link
                to={p.to}
                className="mt-2 self-start text-sm font-medium text-foreground underline decoration-accent decoration-2 underline-offset-8 hover:text-accent"
              >
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bilinç Döngüsü */}
      <section id="bilinc-haritasi" className="container-page pt-8 pb-0 scroll-mt-24">
        <div className="mx-auto max-w-6xl text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">
            Bilinç Döngüsü
          </div>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">
            Bekadan Aydınlanmaya uzanan tek bir döngü
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-foreground/80">
            Yedi seviye, tek harita — her seviye bir beyin bölgesi, bir zekâ
            türü ve bir gelişim aşamasıyla eşleşir.
          </p>
          <figure
            data-map-figure
            className="relative mt-4 mb-0 left-1/2 -translate-x-1/2 w-[140vw] max-w-[1920px]"
          >
            <img
              src={pfaMapAsset.url}
              alt="PFA Bilinç Döngüsü — Yedi İşlevsel Seviye Haritası"
              className="mx-auto block h-auto w-full max-w-none align-bottom drop-shadow-[0_24px_80px_rgba(12,28,32,0.35)] contrast-110"
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      {/* Spacer — 2 cm */}
      <div data-map-gap aria-hidden="true" className="h-[2cm] w-full" />

      {/* Yedi Seviye, Yedi Zekâ */}
      <IntelligencesStrip />

      {/* Neden Bir Harita */}
      <section className="container-page pt-0 pb-16">
        <div className="mx-auto max-w-3xl border-t border-border pt-6 text-center">
          <div data-neden-heading className="text-xs uppercase tracking-[0.3em] text-accent">
            Neden Bir Harita?
          </div>
          <p className="mt-6 font-serif text-2xl leading-relaxed text-foreground md:text-3xl">
            “Bilinç, yedi enstrümanlı bir orkestradan ortaya çıkan müziktir—
            duymayı öğrenen kulak, orkestradaki detone enstrümanı ayırabilir
            hatta akordunu yapabilir.”
          </p>
          <p className="mt-8 text-base leading-relaxed text-foreground/80">
            Oryantasyonun olmadığı her ortamda kaygının temel nedeni bilinç
            seviyeleri arasındaki kaybolmuşluktur. PFA, bilincin işlevlerini
            muğlak tek bir adreste değil, yedi ayrı işlevsel adreste ele alır.
          </p>
        </div>
      </section>
    </div>
  );
}

const AUDIENCES = [
  {
    tag: "Profesyoneller",
    sub: "Psikolog · Koç · Terapist · Eğitimci",
    body: "Danışan ve öğrencilerinizle yapılandırılmış bir bilinç haritası üzerinden çalışın.",
    cta: "Uygulayıcı Olun",
    to: "/uygulayici-olun",
  },
  {
    tag: "Meraklı Okurlar",
    sub: "Kendini anlamak isteyen herkes",
    body: "Kendi haritanızı kitapla keşfedin.",
    cta: "Kitaplarla Derinleşin",
    to: "/kitaplar",
  },
  {
    tag: "Kurumsal",
    sub: "İK · Liderlik · Ekip gelişimi",
    body: "Ekiplerin işlevsel gelişimini ölçülebilir hale getirin.",
    cta: "PFA Ölçeği'ni Uygulayın",
    to: "/degerlendirme",
  },
] as const;

function AudienceSection() {
  return (
    <section className="container-page py-14 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">
            PFA Kime Hitap Eder
          </div>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">
            Üç yol, tek harita
          </h2>
        </div>
        <div className="mt-10 grid items-center gap-10 md:grid-cols-2">
          <div className="order-1 md:order-none">
            <img
              src={heroStepsAsset.url}
              alt="Bilincin yedi basamağı — beka merdiveninden aydınlanmaya yolculuk"
              className="mx-auto block h-auto w-full max-w-md object-contain"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col gap-4">
            {AUDIENCES.map((a) => (
              <div
                key={a.tag}
                className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent/60"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-serif text-xl text-foreground">{a.tag}</div>
                  <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
                    {a.sub}
                  </div>
                </div>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-foreground/80">
                  {a.body}
                </p>
                <Link
                  to={a.to}
                  className="mt-4 inline-block text-sm font-medium text-foreground underline decoration-accent decoration-2 underline-offset-8 hover:text-accent"
                >
                  {a.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


function IntelligencesStrip() {
  const items = [1, 2, 3, 4, 5, 6, 7].map((lvl) => ({
    lvl,
    level: LEVEL_LABEL_TR[lvl],
    intel: INTELLIGENCE_LABEL[LEVEL_TO_INTELLIGENCE[lvl]],
  }));
  return (
    <section className="container-page py-12 md:py-14">
      <div className="mx-auto max-w-6xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">
          Yedi Seviye, Yedi Zekâ
        </div>
        <ol className="mt-8 flex flex-wrap items-stretch justify-center gap-2 md:gap-3">
          {items.map((it, i) => (
            <li key={it.lvl} className="flex items-center gap-2 md:gap-3">
              <div className="flex min-w-[9.5rem] flex-col items-center gap-1 rounded-full border border-border bg-card/60 px-4 py-2">
                <div className="text-[0.68rem] uppercase tracking-[0.25em] text-accent">
                  L{it.lvl}
                </div>
                <div className="text-[0.78rem] font-medium text-foreground/85">
                  {it.intel}
                </div>
              </div>
              {i < items.length - 1 && (
                <span aria-hidden className="hidden h-px w-3 bg-border md:block" />
              )}
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-8 max-w-2xl font-serif text-lg leading-relaxed text-foreground/85 md:text-xl">
          Her seviyenin kendi zekâsı vardır; gelişim, bu zekâların birlikte
          akort edilmesidir.
        </p>
        <p className="mt-3 text-xs tracking-wide text-muted-foreground">
          Zekâ profili ölçümü üzerinde çalışıyoruz.
        </p>
      </div>
    </section>
  );
}

function Ornament() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-8 -z-0 -translate-x-1/2 opacity-[0.18]"
      width="720"
      height="720"
      viewBox="0 0 720 720"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      <circle cx="360" cy="360" r="340" />
      <circle cx="360" cy="360" r="260" />
      <circle cx="360" cy="360" r="180" />
      <circle cx="360" cy="360" r="100" />
      <circle cx="360" cy="20" r="3" fill="currentColor" />
      <circle cx="360" cy="700" r="3" fill="currentColor" />
      <circle cx="20" cy="360" r="3" fill="currentColor" />
      <circle cx="700" cy="360" r="3" fill="currentColor" />
    </svg>
  );
}