import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { BuyButton } from "@/components/buy-button";
import { getBooksData, type BooksPayload } from "@/lib/books.functions";
import { amazonUrlFor, bookSlugFor, fmtUsd, isLive, MARKETPLACE_NAMES_EN } from "@/lib/bundles";
import { HOME_COPY } from "@/content/home-en";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";
import torusMap from "@/assets/torus-map-final-2.png.asset.json";

const C = HOME_COPY.en;
const URL = `${SITE_URL}/en`;

const booksQuery = () =>
  queryOptions({ queryKey: ["books-data"], queryFn: () => getBooksData(), staleTime: 0 });

export const Route = createFileRoute("/en/")({
  head: () => ({
    meta: [
      { title: "Psycho-Functional Analysis (PFA) — a functional map of consciousness" },
      {
        name: "description",
        content:
          "PFA maps human consciousness across seven functional levels. Books, the PFA Assessment and report, and the upcoming 7Q Profile — all digital products.",
      },
      { property: "og:title", content: "Psycho-Functional Analysis (PFA)" },
      {
        property: "og:description",
        content: "A functional map of human consciousness: seven levels, seven intelligences.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en")],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(booksQuery()),
  component: EnHome,
});

function EnHome() {
  return (
    <div>
      <section className="bg-hero-map-bg">
        <div className="container-page py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[1.09375rem] font-medium uppercase tracking-[0.35em] text-accent md:text-xl">
              {C.eyebrow}
            </div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.08] text-foreground md:text-6xl">
              {C.h1a}
              <br />
              <em className="not-italic text-accent">{C.h1b}</em>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
              {C.lede}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href="#books" className="btn-primary hover:btn-primary-hover">
                {C.ctaBooks}
              </a>
              <a href="#map" className="btn-outline hover:bg-foreground/5">
                {C.ctaMap}
              </a>
            </div>
            <div className="mx-auto mt-14 flex max-w-md items-center justify-center gap-6 text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
              {C.metaRow.map((m, i) => (
                <span key={m} className="flex items-center gap-6">
                  {i > 0 && <span className="h-px w-8 bg-border" />}
                  {m}
                </span>
              ))}
            </div>
            <figure className="mx-auto mt-10 w-full max-w-5xl">
              <img
                src={torusMap.url}
                alt="Psycho-Functional Analysis torus map, from Survival to Enlightenment"
                className="block h-auto w-full opacity-90"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* The map */}
      <section id="map" className="container-page scroll-mt-24 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.mapEyebrow}</div>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl">{C.mapTitle}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-foreground/80">
            {C.mapIntro}
          </p>
          <ol className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
            {C.levels.map((l) => (
              <li key={l.code} className="rounded-lg border border-border/70 bg-card/70 px-4 py-4">
                <div className="flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-accent/80">
                  {l.code}
                  <span className="inline-block h-px w-4 bg-accent/40" />
                </div>
                <div className="mt-2 font-serif text-lg text-foreground">{l.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{l.intel}</div>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-foreground/75">
            {C.levelsNote}
          </p>
        </div>
      </section>

      {/* What is available */}
      <section id="books" className="container-page scroll-mt-24 border-t border-border py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.offerEyebrow}</div>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl">{C.offerTitle}</h2>
        </div>
        <Suspense
          fallback={<p className="mt-12 text-center text-sm text-muted-foreground">Loading…</p>}
        >
          <OfferBlocks />
        </Suspense>
      </section>

      {/* Notice + legal */}
      <section className="container-page border-t border-border py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl text-primary">{C.noticeTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{C.noticeBody}</p>
          <div className="mt-8 text-xs uppercase tracking-[0.3em] text-accent">{C.legalEyebrow}</div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <a href="/en/refund-policy" className="underline decoration-accent underline-offset-4 hover:text-accent">
              {C.refundLink}
            </a>
            <a href="/en/terms" className="underline decoration-accent underline-offset-4 hover:text-accent">
              {C.termsLink}
            </a>
          </div>
          <p className="mt-4 text-sm text-foreground/80">
            {C.contactLine}{" "}
            <a
              href="mailto:info@psychofunctionalanalysis.com"
              className="text-accent hover:underline"
            >
              info@psychofunctionalanalysis.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function OfferBlocks() {
  const { data } = useSuspenseQuery(booksQuery());
  const products = new Map(data.products.map((p) => [p.slug, p]));

  const signedSlug = bookSlugFor("pfa", "en");
  const signed = products.get(signedSlug);
  const signedLive = signed ? isLive(signed) : false;

  const assessment = products.get("tam-assessment-rapor");
  const assessmentLive = assessment ? isLive(assessment) : false;

  const editions = data.editions
    .filter((e) => e.book_key === "pfa" && e.language === "en" && e.active && e.asin)
    .sort((a, b) => a.sort_order - b.sort_order);
  const kindle = editions.find((e) => e.format === "kindle");
  const paperback = editions.find((e) => e.format === "paperback");
  const cover = signed?.cover_image_url ?? null;

  return (
    <div className="mt-12 space-y-12">
      {/* Book */}
      <div className="grid gap-10 md:grid-cols-[minmax(200px,260px)_1fr] md:items-start">
        <div className="mx-auto w-full max-w-[240px] md:mx-0">
          <div className="aspect-[5/8] w-full overflow-hidden rounded-md border border-border bg-card">
            {cover ? (
              <img
                src={cover}
                alt="Psycho-Functional Analysis — English edition cover"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center font-serif text-foreground/50">
                {C.bookTitle}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-serif text-2xl text-primary md:text-3xl">{C.bookTitle}</h3>
          <p className="mt-2 font-serif italic text-foreground/75">{C.bookSubtitle}</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/80">{C.bookDesc}</p>

          {(kindle || paperback) && (
            <div className="mt-6 rounded-lg border border-border bg-card p-5">
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
                {C.amazonHeading}
              </div>
              <div className="mt-3 space-y-2">
                {kindle && <AmazonRow label={C.amazonKindle} edition={kindle} />}
                {paperback && <AmazonRow label={C.amazonPaperback} edition={paperback} />}
              </div>
            </div>
          )}

          {signedLive && signed && (
            <div className="mt-6 rounded-lg border border-accent/40 bg-accent/5 p-5">
              <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-accent">
                <span aria-hidden>✒</span> {C.signedHeading}
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <div className="font-serif text-2xl text-primary">{fmtUsd(signed.price_cents)}</div>
                <div className="text-xs text-muted-foreground">{C.signedPriceNote}</div>
              </div>
              <div className="mt-4">
                <BuyButton productSlug={signedSlug} locale="en" label={C.signedBuyLabel} />
              </div>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {C.signedNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment */}
      <div className="rounded-lg border border-border bg-card p-6 md:p-8">
        <h3 className="font-serif text-2xl text-primary">{C.assessmentTitle}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80">
          {C.assessmentDesc}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{C.assessmentFreeNote}</p>
        {assessmentLive && assessment && (
          <>
            <div className="mt-5 font-serif text-2xl text-primary">
              {fmtUsd(assessment.price_cents)}
            </div>
            <div className="mt-4">
              <BuyButton
                productSlug="tam-assessment-rapor"
                locale="en"
                label={C.assessmentBuyLabel}
              />
            </div>
          </>
        )}
      </div>

      {/* 7Q */}
      <div className="rounded-lg border border-dashed border-border p-6 md:p-8">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="font-serif text-2xl text-primary">{C.sevenqTitle}</h3>
          <span className="rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            {C.sevenqUpcoming}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80">{C.sevenqDesc}</p>
      </div>
    </div>
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
          {C.amazonPick}
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