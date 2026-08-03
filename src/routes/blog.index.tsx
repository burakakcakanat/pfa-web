import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBlogPosts } from "@/lib/blog.functions";
import { listPublishedPodcasts, getPublicSiteSetting } from "@/lib/podcasts.functions";
import { MediaEpisodeCard } from "@/components/media-episode-card";
import { NewsletterForm } from "@/components/newsletter-form";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Yazılar, Podcastler ve Videolar | PFA" },
      {
        name: "description",
        content:
          "PFA içerik merkezi: yazılar, podcast bölümleri ve konuşma / eğitim videoları.",
      },
      { property: "og:title", content: "Blog — PFA" },
      { property: "og:description", content: "PFA yazıları, podcast bölümleri ve videolar." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/blog" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "PodcastSeries",
          name: "Psikofonksiyonel Analiz (PFA)",
          url: "https://psychofunctionalanalysis.com/blog",
        }),
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
  const [category, setCategory] = useState<string>("Tümü");
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog", "posts"],
    queryFn: () => listBlogPosts(),
  });
  const { data: podcasts, isLoading: podcastsLoading } = useQuery({
    queryKey: ["blog", "podcasts"],
    queryFn: () => listPublishedPodcasts(),
    enabled: tab === "podcastler",
  });
  const { data: programUrl } = useQuery({
    queryKey: ["site-setting", "podcast_program_url"],
    queryFn: () => getPublicSiteSetting({ data: { key: "podcast_program_url" } }),
    enabled: tab === "podcastler",
  });
  const categories = Array.from(
    new Set((posts ?? []).map((p) => p.category).filter(Boolean) as string[]),
  );
  const filteredPosts =
    category === "Tümü"
      ? posts
      : posts?.filter((p) => p.category === category);
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Blog</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">İçerik Merkezi</h1>
      </header>

      <div className="mx-auto mt-10 max-w-xl">
        <NewsletterForm source="blog" />
      </div>

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
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 border-b-0 pb-6">
            {["Tümü", ...categories].map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
        {isLoading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        )}
        {!isLoading && (filteredPosts?.length ?? 0) === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Henüz yazı yok.</p>
        )}
        {filteredPosts?.map((p) => (
          <article
            key={p.slug}
            className="grid gap-6 py-10 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-8 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]"
          >
            {p.cover_image_url ? (
              <img
                src={p.cover_image_url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="block h-auto w-full rounded-md object-contain"
                style={{ filter: "none", mixBlendMode: "normal", backgroundBlendMode: "normal", opacity: 1 }}
              />
            ) : (
              <div aria-hidden="true" className="hidden sm:block" />
            )}
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {fmt.format(new Date(p.published_at))}
                {p.category ? (
                  <span className="ml-3 text-accent/80">· {p.category}</span>
                ) : null}
              </div>
              <h2 className="mt-3 font-serif text-2xl md:text-3xl">{p.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-foreground/80">
                {p.seo_description}
              </p>
              <div className="mt-4">
                <Link
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="inline-flex items-center gap-1 text-sm underline decoration-accent decoration-2 underline-offset-8 hover:text-accent"
                >
                  Yazıyı oku →
                </Link>
              </div>
            </div>
          </article>
        ))}
        </div>
      )}

      {tab === "podcastler" && (
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="mb-10 rounded-lg border border-border/70 bg-card/70 p-6 text-center">
            <p className="text-base leading-relaxed text-foreground/85">
              Psikofonksiyonel Analiz (PFA) podcast serisi — yedi seviyelik haritayı bölüm bölüm dinleyin.
            </p>
            {(programUrl || (podcasts && podcasts[0]?.spotify_url)) && (
              <a
                href={programUrl || podcasts![0].spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                Spotify'da programı takip et →
              </a>
            )}
          </div>
          {podcastsLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Yükleniyor…</p>
          )}
          {!podcastsLoading && (podcasts?.length ?? 0) === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Henüz bölüm yok.</p>
          )}
          <div className="space-y-6">
            {podcasts?.map((p) => (
              <MediaEpisodeCard
                key={p.id}
                ep={{
                  id: p.id,
                  episode_number: p.episode_number,
                  title: p.title,
                  description: p.description ?? "",
                  embed_url: p.spotify_embed_url,
                  external_url: p.spotify_url,
                  kind: "podcast",
                }}
              />
            ))}
          </div>
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