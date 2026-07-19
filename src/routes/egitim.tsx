import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/egitim")({
  head: () => ({
    meta: [
      { title: "Eğitim — PFA Temel Programı" },
      {
        name: "description",
        content:
          "PFA Temel Eğitimi: dokuz modüllük online program. Terapistler, koçlar ve eğitimciler için.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TrainingPage,
});

function TrainingPage() {
  const [done, setDone] = useState(false);
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Eğitim</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          PFA Temel Eğitimi — Yakında
        </h1>
        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          Dokuz modüllük online program: giriş, yedi bilinç seviyesi ve entegrasyon.
          Terapistler, koçlar, eğitimciler ve kendi haritası üzerinde çalışmak
          isteyenler için.
        </p>
      </header>

      <div className="mx-auto mt-14 max-w-md rounded-lg border border-border bg-card p-8">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Ön Kayıt
        </div>
        <h2 className="mt-2 font-serif text-xl">Program başladığında haberdar olun</h2>
        {done ? (
          <div className="mt-6 rounded-md border border-accent/50 bg-accent/10 p-5 text-sm">
            Kaydınız alındı. Teşekkürler.
          </div>
        ) : (
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="E-posta adresiniz"
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
            />
            <button className="btn-primary hover:btn-primary-hover">
              Ön Kayıt Ol
            </button>
          </form>
        )}
      </div>
    </div>
  );
}