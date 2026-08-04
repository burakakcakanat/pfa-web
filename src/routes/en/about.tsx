import { createFileRoute } from "@tanstack/react-router";
import { ABOUT_COPY } from "@/content/en-pages";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";

const C = ABOUT_COPY.en;
const URL = `${SITE_URL}/en/about`;

export const Route = createFileRoute("/en/about")({
  head: () => ({
    meta: [
      { title: "About Burak Akçakanat — PFA" },
      {
        name: "description",
        content:
          "Burak Akçakanat, creator of the PFA model: a study of consciousness that began in 2001 and spans more than twenty-three years.",
      },
      { property: "og:title", content: "About Burak Akçakanat" },
      { property: "og:description", content: "The creator of the Psycho-Functional Analysis model." },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/about")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Burak Akçakanat",
          jobTitle: C.role,
          description:
            "Creator of the Psycho-Functional Analysis (PFA) model; a study of consciousness that began in 2001 and spans more than twenty-three years.",
          url: URL,
          worksFor: {
            "@type": "Organization",
            name: "Psycho-Functional Analysis (PFA)",
            url: SITE_URL,
          },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.eyebrow}</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">{C.h1}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{C.role}</p>
        <div className="mt-10 space-y-6 text-base leading-relaxed text-foreground/85">
          {C.paras.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <a href="/en/books" className="underline decoration-accent underline-offset-4 hover:text-accent">
            The books
          </a>
          <a href="/en/levels" className="underline decoration-accent underline-offset-4 hover:text-accent">
            The seven levels
          </a>
        </div>
      </div>
    </div>
  );
}