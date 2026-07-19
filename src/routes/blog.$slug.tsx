import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { getBlogPost } from "@/lib/blog.functions";

const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return {};
    return {
      meta: [
        { title: `${p.title} | PFA Blog` },
        { name: "description", content: p.seo_description },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.seo_description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(p.cover_image_url
          ? [
              { property: "og:image", content: p.cover_image_url },
              { name: "twitter:image", content: p.cover_image_url },
            ]
          : []),
      ],
    };
  },
  errorComponent: BlogPostError,
  notFoundComponent: BlogPostNotFound,
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  return (
    <article className="container-page py-16">
      <div className="mx-auto max-w-[65ch]">
        <Link
          to="/blog"
          className="text-xs uppercase tracking-[0.3em] text-accent hover:underline"
        >
          ← Blog
        </Link>
        <div className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {fmt.format(new Date(post.published_at))}
        </div>
        <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
          {post.title}
        </h1>
        <div className="prose-pfa mt-10">
          <ReactMarkdown
            components={{
              h2: (props) => (
                <h2
                  className="mt-12 font-serif text-2xl md:text-3xl"
                  {...props}
                />
              ),
              h3: (props) => (
                <h3 className="mt-10 font-serif text-xl md:text-2xl" {...props} />
              ),
              p: (props) => (
                <p
                  className="mt-6 text-base leading-[1.85] text-foreground/85"
                  {...props}
                />
              ),
              em: (props) => <em className="italic text-foreground" {...props} />,
              strong: (props) => (
                <strong className="font-semibold text-foreground" {...props} />
              ),
              a: (props) => (
                <a
                  className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
                  {...props}
                />
              ),
              ul: (props) => (
                <ul className="mt-6 list-disc space-y-2 pl-6" {...props} />
              ),
              ol: (props) => (
                <ol className="mt-6 list-decimal space-y-2 pl-6" {...props} />
              ),
              blockquote: (props) => (
                <blockquote
                  className="mt-8 border-l-2 border-accent pl-6 italic text-foreground/80"
                  {...props}
                />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}

function BlogPostError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-serif text-3xl">Bir sorun oluştu</h1>
      <p className="mt-4 text-foreground/70">{error.message}</p>
      <button
        onClick={() => {
          reset();
          router.invalidate();
        }}
        className="mt-6 text-sm underline decoration-accent decoration-2 underline-offset-8"
      >
        Tekrar dene
      </button>
    </div>
  );
}

function BlogPostNotFound() {
  const { slug } = Route.useParams();
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-serif text-3xl">Yazı bulunamadı</h1>
      <p className="mt-4 text-foreground/70">"{slug}" için yayınlanmış bir yazı yok.</p>
      <Link
        to="/blog"
        className="mt-6 inline-block text-sm underline decoration-accent decoration-2 underline-offset-8"
      >
        Blog'a dön
      </Link>
    </div>
  );
}