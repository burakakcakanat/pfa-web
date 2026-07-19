import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — PFA" },
      {
        name: "description",
        content: "PFA blog: bilinç, harita ve işlevsel farkındalık üzerine yazılar.",
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

function BlogPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Blog</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Yazılar</h1>
      </header>

      <div className="mx-auto mt-14 max-w-3xl divide-y divide-border border-t border-border">
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
    </div>
  );
}