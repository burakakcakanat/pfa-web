import { createFileRoute, Link } from "@tanstack/react-router";

const TORUS_URL =
  "https://static.wixstatic.com/media/db0c25_c6821ab1b9bb4810a0f8df2c8e676e81~mv2.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PFA — İnsan Bilincinin İşlevsel Haritası" },
      {
        name: "description",
        content:
          "Psiko-Fonksiyonel Analiz, insan bilincini yedi işlevsel seviyeye ayırır — bekadan birliğe uzanan bir harita.",
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
    body: "PA Ölçeği, her seviye için 30 soruyla hangi işlevin aksadığını gösterir; farkındalığı işlevsel farkındalığa taşır.",
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
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Ornament />
        <div className="container-page relative py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 text-xs uppercase tracking-[0.3em] text-accent">
              Psycho-Functional Analysis
            </div>
            <h1 className="font-serif text-4xl leading-[1.1] md:text-6xl">
              PFA: İnsan Bilincinin İşlevsel Haritası
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
              Psiko-Fonksiyonel Analiz, insan bilincini yedi işlevsel seviyeye
              ayırır — tek bir hücrenin hayatta kalma güdüsünden evrensel birlik
              deneyimine dek — ve her birini bir beyin bölgesiyle, bir zekâ türüyle
              ve bir gelişim aşamasıyla eşler.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/degerlendirme" className="btn-primary hover:btn-primary-hover">
                Haritayı Keşfet
              </Link>
              <Link to="/kitaplar" className="btn-outline hover:bg-foreground/5">
                Kitapları İncele
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Three paths */}
      <section className="container-page py-20">
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
      <section className="container-page py-20">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="text-xs uppercase tracking-[0.3em] text-accent">
              Bilinç Döngüsü
            </div>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              Bekadan birliğe uzanan tek bir döngü
            </h2>
            <p className="mt-6 text-base leading-relaxed text-foreground/80">
              Bilinç, beka ile birlik arasında uzanan tek bir döngüde hareket eder:
              ilk üç seviyede genişleme, dördüncü seviyeden itibaren bütünleşme.
              Harita, bu yolculukta kaybolmanın bir kader olmadığını gösterir.
            </p>
          </div>
          <figure className="order-1 md:order-2">
            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
              <img
                src={TORUS_URL}
                alt="Bilinç Döngüsü — İşlevsel Harita"
                className="mx-auto h-auto w-full"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-3 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Bilinç Döngüsü
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Neden Bir Harita */}
      <section className="container-page py-20">
        <div className="mx-auto max-w-3xl border-t border-border pt-16 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">
            Neden Bir Harita?
          </div>
          <p className="mt-6 font-serif text-2xl leading-relaxed text-foreground md:text-3xl">
            “Bilinç, yedi enstrümanlı bir orkestradır — duymayı öğrenen kulak,
            detone bir müzikle karşılaştığında hangi enstrümana bakacağını bilir.”
          </p>
          <p className="mt-8 text-base leading-relaxed text-foreground/80">
            Oryantasyonun olmadığı her ortamda kaygının temel nedeni kaybolmuşluktur.
            PFA, bilincin işlevlerini muğlak tek bir adreste değil, yedi ayrı
            işlevsel adreste ele alır.
          </p>
        </div>
      </section>
    </div>
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