import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBlogPosts } from "@/lib/blog.functions";

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

const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

type Tab = "yazilar" | "podcastler" | "videolar";

const TABS: { id: Tab; label: string }[] = [
  { id: "yazilar", label: "Yazılar" },
  { id: "podcastler", label: "Podcastler" },
  { id: "videolar", label: "Videolar" },
];

function BlogPage() {
  const [tab, setTab] = useState<Tab>("yazilar");
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog", "posts"],
    queryFn: () => listBlogPosts(),
  });
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
        {isLoading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        )}
        {!isLoading && (posts?.length ?? 0) === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Henüz yazı yok.</p>
        )}
        {posts?.map((p) => (
          <article key={p.slug} className="py-10">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {fmt.format(new Date(p.published_at))}
            </div>
            <h2 className="mt-3 font-serif text-2xl md:text-3xl">
              <Link
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="hover:text-accent"
              >
                {p.title}
              </Link>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/80">
              {p.seo_description}
            </p>
            <div className="mt-5">
              <Link
                to="/blog/$slug"
                params={{ slug: p.slug }}
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