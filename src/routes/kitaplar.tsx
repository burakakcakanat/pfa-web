import { createFileRoute } from "@tanstack/react-router";
import { BuyButton } from "@/components/buy-button";
import { GiftModal } from "@/components/gift-modal";
import { useState } from "react";
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

type Book = {
  title: string;
  lang: string;
  cover: string;
  desc: string;
  ebookSlug: string;
  priceLabel: string;
  amazonUrl?: string;
  mute?: boolean;
};

const BOOKS: Book[] = [
  {
    title: "Psycho-Functional Analysis (PFA)",
    lang: "EN",
    cover:
      "https://static.wixstatic.com/media/db0c25_5566b0e9d34045899974c8ac7c564552~mv2.png",
    desc: "A map of consciousness — from survival to unity.",
    ebookSlug: "pfa-ebook-en",
    priceLabel: "$11.99",
    amazonUrl: "https://www.amazon.com/dp/B0H3BSWK1D",
  },
  {
    title: "PFA: Bilinç Çözümleme",
    lang: "TR",
    cover:
      "https://static.wixstatic.com/media/db0c25_1409f60fe7f04746beef167966abdd57~mv2.png",
    desc: "Bir bilinç haritası — bekadan birliğe. Terapistler, koçlar, eğitimciler ve kendini anlamaya yola çıkmış herkes için bir yol bulma aracı.",
    ebookSlug: "pfa-ebook-tr",
    priceLabel: "$11.99",
  },
  {
    title: "Human Consciousness Decoded",
    lang: "EN · 2015",
    cover: hcdCover.url,
    desc: "Aydınlanmanın bilimi üzerine ilk eser; PFA modelinin kökleri.",
    ebookSlug: "hcd-ebook-en",
    priceLabel: "$9.99",
    amazonUrl: "https://www.amazon.com/dp/B00YJP1ODE",
    mute: true,
  },
];

function BooksPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Kitaplar</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Haritanın kaynak metinleri</h1>
        <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-accent/40 bg-accent/5 px-6 py-5 text-left">
          <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-accent">
            <span aria-hidden>✒</span> İsme İmzalı Nüsha
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Siteden satın alınan her e-kitap, yazarın imzasını taşıyan, adınıza hazırlanmış
            <em> kişisel bir nüsha</em>dır. Standart baskılar Amazon ve Google Play'de.
          </p>
        </div>
      </header>

      <div className="mt-16 grid gap-12 md:grid-cols-3">
        {BOOKS.map((b) => (
          <BookCard key={b.title} book={b} />
        ))}
      </div>
      <p className="mx-auto mt-14 max-w-2xl text-center text-xs text-muted-foreground">
        Tüm e-book'lar kişisel kullanım için lisanslıdır. Satın alma sonrası
        <span> </span>
        <a href="/hesabim" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
          Hesabım → E-Book'larım
        </a>
        <span> </span>alanından okuyabilir veya indirebilirsiniz.
      </p>
    </div>
  );
}

function BookCard({ book: b }: { book: Book }) {
  const [giftOpen, setGiftOpen] = useState(false);
  return (
    <>
      <article className="flex h-full flex-col">
            <div className="relative mx-auto aspect-[5/8] w-full max-w-[280px] overflow-hidden rounded-md border border-border bg-card shadow-[0_20px_50px_-30px_rgba(31,78,82,0.4)]">
              {b.cover ? (
                <>
                  <img
                    src={b.cover}
                    alt={`${b.title} kapağı`}
                    className={`h-full w-full object-cover ${
                      b.mute
                        ? "opacity-85 saturate-[0.6] contrast-[0.92] brightness-[0.95]"
                        : ""
                    }`}
                    loading="lazy"
                  />
                  {b.mute && (
                    <div className="pointer-events-none absolute inset-0 bg-background/25 mix-blend-soft-light" />
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted p-6 text-center font-serif text-lg text-foreground/60">
                  {b.title}
                </div>
              )}
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.15em] text-background shadow">
            İmzalı Nüsha
          </span>
            </div>
            <div className="mt-6 flex flex-1 flex-col text-center">
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
                {b.lang}
              </div>
              <h2 className="mt-2 font-serif text-xl">{b.title}</h2>
              <p className="mx-auto mt-3 max-w-xs flex-1 text-sm leading-relaxed text-foreground/75">
                {b.desc}
              </p>
              <div className="mt-6 flex flex-col items-center gap-2">
                <BuyButton
                  productSlug={b.ebookSlug}
                  label={`İmzalı Nüshanı Al (${b.priceLabel})`}
                />
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              className="text-xs text-foreground/70 underline decoration-accent decoration-1 underline-offset-4 hover:text-accent"
            >
              Hediye Et →
            </button>
                {b.amazonUrl && (
                  <a
                    href={b.amazonUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-muted-foreground underline decoration-accent/60 decoration-1 underline-offset-4 hover:text-accent"
                  >
                    Amazon'da baskıyı gör →
                  </a>
                )}
              </div>
            </div>
      </article>
      <GiftModal
        productSlug={b.ebookSlug}
        productTitle={b.title}
        priceLabel={b.priceLabel}
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
      />
    </>
  );
}