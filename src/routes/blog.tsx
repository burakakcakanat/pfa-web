import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Yazılar, Podcastler ve Videolar | PFA" },
      {
        name: "description",
        content:
          "PFA içerik merkezi: yazılar, podcast bölümleri ve konuşma / eğitim videoları.",
      },
    ],
  }),
  component: BlogPage,
});

const POSTS = [
  {
    slug: "bilinc-neden-bir-haritaya-ihtiyac-duyar",
    title: "Bilinç Neden Bir Haritaya İhtiyaç Duyar?",
    date: "2026-01-12",
    excerpt:
      "Oryantasyonun olmadığı her ortamda kaygının kökü kaybolmuşluktur. PFA bu kaybolmuşluğa yedi işlevsel adres önerir.",
  },
];

const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

type Tab = "yazilar" | "podcastler" | "videolar";

const TABS: { id: Tab; label: string }[] = [
  { id: "yazilar", label: "Yazılar" },
  { id: "podcastler", label: "Podcastler" },
  { id: "videolar", label: "Videolar" },
];

function BlogPage() {
  const [tab, setTab] = useState<Tab>("yazilar");
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Blog</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">İçerik Merkezi</h1>
      </header>

      <div
        role="tablist"
        aria-label="İçerik türleri"
        className="mx-auto mt-12 flex max-w-3xl justify-center gap-2 border-b border-border"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-5 py-3 text-sm tracking-wide transition-colors ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "yazilar" && (
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border">
        {POSTS.map((p) => (
          <article key={p.slug} className="py-10">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {fmt.format(new Date(p.date))}
            </div>
            <h2 className="mt-3 font-serif text-2xl md:text-3xl">
              <Link to="/blog" className="hover:text-accent">
                {p.title}
              </Link>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/80">
              {p.excerpt}
            </p>
            <div className="mt-5">
              <Link
                to="/blog"
                className="text-sm underline decoration-accent decoration-2 underline-offset-8 hover:text-accent"
              >
                Yazıyı oku →
              </Link>
            </div>
          </article>
        ))}
        </div>
      )}

      {tab === "podcastler" && (
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-card text-xs uppercase tracking-[0.25em] text-muted-foreground"
              >
                Yakında
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-foreground/70">
            İlk bölümler yakında.
          </p>
        </div>
      )}

      {tab === "videolar" && (
        <div className="mx-auto mt-14 max-w-5xl">
          <p className="mx-auto max-w-2xl text-center text-base text-foreground/75">
            İlk video serisi hazırlanıyor.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-card text-xs uppercase tracking-[0.25em] text-muted-foreground"
              >
                Yakında
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}