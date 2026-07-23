import { useState } from "react";

export type MediaEpisode = {
  id: string;
  episode_number: number;
  title: string;
  description: string;
  embed_url: string;
  external_url: string;
  kind: "podcast" | "video";
};

export function MediaEpisodeCard({ ep }: { ep: MediaEpisode }) {
  const [expanded, setExpanded] = useState(false);
  const isPodcast = ep.kind === "podcast";
  const iframeHeight = isPodcast ? 152 : 315;
  const long = ep.description.length > 220;
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent">
          Bölüm {ep.episode_number}
        </span>
        <h3 className="font-serif text-xl md:text-2xl">{ep.title}</h3>
      </div>
      <p
        className={`text-sm leading-relaxed text-foreground/80 ${
          expanded || !long ? "" : "line-clamp-3"
        }`}
      >
        {ep.description}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs uppercase tracking-[0.2em] text-accent underline-offset-4 hover:underline"
        >
          {expanded ? "Daralt" : "Devamını oku"}
        </button>
      )}
      <div className="mt-4 overflow-hidden rounded-md border border-border/60">
        <iframe
          src={ep.embed_url}
          width="100%"
          height={iframeHeight}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          title={ep.title}
          className="block w-full"
        />
      </div>
    </article>
  );
}