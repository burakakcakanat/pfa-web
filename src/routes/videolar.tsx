import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/videolar")({
  head: () => ({
    meta: [
      { title: "Videolar — Konuşmalar ve Eğitim | PFA" },
      { name: "description", content: "PFA konuşmaları ve eğitim videoları." },
    ],
  }),
  component: VideosPage,
});

function VideosPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Videolar</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          Konuşmalar ve Eğitim Videoları
        </h1>
        <p className="mt-6 text-base text-foreground/75">
          İlk video serisi hazırlanıyor.
        </p>
      </header>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
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
  );
}