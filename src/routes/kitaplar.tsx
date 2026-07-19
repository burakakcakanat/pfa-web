import { createFileRoute } from "@tanstack/react-router";
import hcdCover from "@/assets/hcd-cover.png.asset.json";

export const Route = createFileRoute("/kitaplar")({
  head: () => ({
    meta: [
      { title: "Kitaplar — PFA" },
      {
        name: "description",
        content:
          "Psycho-Functional Analysis kitapları: bilincin yedi seviyeli haritası ve modelin kökleri.",
      },
    ],
  }),
  component: BooksPage,
});

const BOOKS = [
  {
    title: "Psycho-Functional Analysis (PFA)",
    lang: "EN",
    cover:
      "https://static.wixstatic.com/media/db0c25_5566b0e9d34045899974c8ac7c564552~mv2.png",
    desc: "A map of consciousness — from survival to unity.",
    cta: { label: "Amazon'da Satın Al", href: "https://www.amazon.com/dp/B0H3BSWK1D", disabled: false },
  },
  {
    title: "PFA: Bilinç Çözümleme",
    lang: "TR",
    cover:
      "https://static.wixstatic.com/media/db0c25_1409f60fe7f04746beef167966abdd57~mv2.png",
    desc: "Bir bilinç haritası — bekadan birliğe. Terapistler, koçlar, eğitimciler ve kendini anlamaya yola çıkmış herkes için bir yol bulma aracı.",
    cta: { label: "Google Play'de Yakında", href: "#", disabled: true },
  },
  {
    title: "Human Consciousness Decoded",
    lang: "EN · 2015",
    cover: hcdCover.url,
    desc: "Aydınlanmanın bilimi üzerine ilk eser; PFA modelinin kökleri.",
    cta: null,
  },
] as const;

function BooksPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Kitaplar</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Haritanın kaynak metinleri</h1>
      </header>

      <div className="mt-16 grid gap-12 md:grid-cols-3">
        {BOOKS.map((b) => (
          <article key={b.title} className="flex flex-col">
            <div className="relative mx-auto aspect-[5/8] w-full max-w-[280px] overflow-hidden rounded-md border border-border bg-card shadow-[0_20px_50px_-30px_rgba(31,78,82,0.4)]">
              {b.cover ? (
                <>
                  <img
                    src={b.cover}
                    alt={`${b.title} kapağı`}
                    className="h-full w-full object-cover opacity-90 saturate-[0.75] contrast-[0.95] mix-blend-multiply"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-background/15" />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted p-6 text-center font-serif text-lg text-foreground/60">
                  {b.title}
                </div>
              )}
            </div>
            <div className="mt-6 text-center">
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
                {b.lang}
              </div>
              <h2 className="mt-2 font-serif text-xl">{b.title}</h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-foreground/75">
                {b.desc}
              </p>
              {b.cta &&
                (b.cta.disabled ? (
                  <button
                    disabled
                    className="btn-outline mt-5 cursor-not-allowed opacity-50"
                  >
                    {b.cta.label}
                  </button>
                ) : (
                  <a
                    href={b.cta.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-primary hover:btn-primary-hover mt-5"
                  >
                    {b.cta.label}
                  </a>
                ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}