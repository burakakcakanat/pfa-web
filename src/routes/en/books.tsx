import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { BuyButton } from "@/components/buy-button";
import { getBooksData, type BooksPayload } from "@/lib/books.functions";
import { amazonUrlFor, bookSlugFor, fmtUsd, isLive, MARKETPLACE_NAMES_EN } from "@/lib/bundles";
import { BOOKS_COPY } from "@/content/en-pages";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";
import hcdCover from "@/assets/hcd-cover.png.asset.json";

const C = BOOKS_COPY.en;
const URL = `${SITE_URL}/en/books`;

const booksQuery = () =>
  queryOptions({ queryKey: ["books-data"], queryFn: () => getBooksData(), staleTime: 0 });

export const Route = createFileRoute("/en/books")({
  head: () => ({
    meta: [
      { title: "Books — Psycho-Functional Analysis" },
      {
        name: "description",
        content:
          "Psycho-Functional Analysis on Amazon (Kindle and paperback), the personalised signed copy as a digital PDF, and Human Consciousness Decoded (2015).",
      },
      { property: "og:title", content: "Books — Psycho-Functional Analysis" },
      {
        property: "og:description",
        content: "The source texts of the map: PFA and its 2015 predecessor.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/books")],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(booksQuery()),
  component: EnBooksPage,
});

function EnBooksPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.eyebrow}</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">{C.h1}</h1>
        <p className="mt-6 text-sm leading-relaxed text-foreground/75">{C.lede}</p>
      </header>

      <Suspense
        fallback={<p className="mt-16 text-center text-sm text-muted-foreground">{C.loading}</p>}
      >
        <BooksContent />
      </Suspense>
    </div>
  );
}

function BooksContent() {
  const { data } = useSuspenseQuery(booksQuery());
  const products = new Map(data.products.map((p) => [p.slug, p]));

  return (
    <div className="mt-16 space-y-24">
      <BookBlock meta={C.pfa} bookKey="pfa" data={data} products={products} showSigned />
      <BookBlock meta={C.hcd} bookKey="hcd" data={data} products={products} showSigned />
    </div>
  );
}

function BookBlock({
  meta,
  bookKey,
  data,
  products,
  showSigned,
}: {
  meta: { kicker: string; title: string; subtitle: string; desc: string };
  bookKey: "pfa" | "hcd";
  data: BooksPayload;
  products: Map<string, BooksPayload["products"][number]>;
  showSigned: boolean;
}) {
  const productSlug = bookSlugFor(bookKey, "en");
  const product = products.get(productSlug);
  // HCD site sales stay hidden until their activate_at date — same rule as the
  // Turkish books page. Do not bypass isLive().
  const productLive = product ? isLive(product) : false;

  const editions = data.editions
    .filter((e) => e.book_key === bookKey && e.language === "en" && e.active && e.asin)
    .sort((a, b) => a.sort_order - b.sort_order);
  const kindle = editions.find((e) => e.format === "kindle");
  const paperback = editions.find((e) => e.format === "paperback");

  const cover = product?.cover_image_url || (bookKey === "hcd" ? hcdCover.url : "");

  return (
    <section className="grid gap-12 md:grid-cols-[minmax(240px,320px)_1fr] md:items-start">
      <div className="mx-auto w-full max-w-[280px] md:mx-0">
        <div className="aspect-[5/8] w-full overflow-hidden rounded-md border border-border bg-card shadow-[0_20px_50px_-30px_rgba(31,78,82,0.4)]">
          {cover ? (
            <img
              src={cover}
              alt={`${meta.title} — book cover`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-4 text-center font-serif text-foreground/50">
              {meta.title}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          {meta.kicker} · {C.langLabel.en}
        </div>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">{meta.title}</h2>
        <p className="mt-3 font-serif italic text-foreground/75">{meta.subtitle}</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/80">{meta.desc}</p>

        {(kindle || paperback) && (
          <div className="mt-8 rounded-lg border border-border bg-card p-5">
            <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
              {C.amazonHeading}
            </div>
            <div className="mt-3 space-y-2">
              {kindle && <AmazonRow label={C.kindle} edition={kindle} />}
              {paperback && <AmazonRow label={C.paperback} edition={paperback} />}
            </div>
          </div>
        )}

        {showSigned && productLive && product && (
          <div className="mt-6 rounded-lg border border-accent/40 bg-accent/5 p-5">
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-accent">
              <span aria-hidden>✒</span> {C.signedHeading}
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <div className="font-serif text-2xl text-primary">{fmtUsd(product.price_cents)}</div>
              <div className="text-xs text-muted-foreground">{C.signedPriceNote}</div>
            </div>
            <div className="mt-4">
              <BuyButton productSlug={productSlug} locale="en" label={C.signedBuy} />
            </div>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {C.signedNote}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function AmazonRow({ label, edition }: { label: string; edition: BooksPayload["editions"][number] }) {
  const options = edition.marketplaces
    .map((mk) => ({ mk, url: amazonUrlFor(mk, edition.asin, edition.overrides) }))
    .filter((o): o is { mk: string; url: string } => !!o.url);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-serif text-base">{label}</span>
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground marker:hidden focus:outline-none focus:ring-2 focus:ring-accent">
          {C.pickCountry}
        </summary>
        <ul
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] overflow-hidden rounded-md border border-border bg-background shadow-lg"
        >
          {options.map(({ mk, url }) => (
            <li key={mk} role="none">
              <a
                role="menuitem"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-1.5 text-sm text-foreground hover:bg-accent/10 hover:text-accent"
              >
                {MARKETPLACE_NAMES_EN[mk] ?? mk.toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}