import { createFileRoute } from "@tanstack/react-router";
import { LEVELS_COPY } from "@/content/en-pages";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";
import torusMap from "@/assets/torus-map-final-2.png.asset.json";

const C = LEVELS_COPY.en;
const URL = `${SITE_URL}/en/levels`;

export const Route = createFileRoute("/en/levels")({
  head: () => ({
    meta: [
      { title: "The seven levels of consciousness — PFA" },
      {
        name: "description",
        content:
          "The seven functional levels of Psycho-Functional Analysis: name, intelligence type and brain anchor for each, from Survival (PQ) to Enlightenment (GQ).",
      },
      { property: "og:title", content: "The seven levels of consciousness — PFA" },
      {
        property: "og:description",
        content: "Seven functional levels, seven intelligences — and why no level is better than another.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/levels")],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.eyebrow}</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">{C.h1}</h1>
        <p className="mt-6 text-base leading-relaxed text-foreground/80">{C.lede}</p>
      </header>

      <figure className="mx-auto mt-10 w-full max-w-5xl">
        <img
          src={torusMap.url}
          alt="Psycho-Functional Analysis torus map, from Survival to Enlightenment"
          className="block h-auto w-full opacity-90"
        />
      </figure>

      <ol className="mx-auto mt-14 max-w-3xl space-y-6">
        {C.levels.map((l) => (
          <li
            key={l.code}
            className="rounded-lg border border-border bg-card p-6 shadow-[0_20px_50px_-45px_rgba(31,78,82,0.45)] md:p-8"
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-accent">
                {l.code}
              </span>
              <h2 className="font-serif text-2xl text-primary md:text-3xl">{l.name}</h2>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{l.intel}</span>
              <span aria-hidden>·</span>
              <span>{l.anchor}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">{l.body}</p>
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-16 max-w-3xl space-y-10 border-t border-border pt-12">
        <section>
          <h2 className="font-serif text-2xl text-primary">{C.principleTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{C.principleBody}</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-primary">{C.directionTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{C.directionBody}</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-primary">{C.attunementTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{C.attunementBody}</p>
        </section>

        <section>
          <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.ctaTitle}</div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <a href="/en/books" className="underline decoration-accent underline-offset-4 hover:text-accent">
              {C.ctaBooks}
            </a>
            <a href="/en/about" className="underline decoration-accent underline-offset-4 hover:text-accent">
              {C.ctaAbout}
            </a>
            <a href="/en/contact" className="underline decoration-accent underline-offset-4 hover:text-accent">
              {C.ctaContact}
            </a>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">{C.notice}</p>
      </div>
    </div>
  );
}