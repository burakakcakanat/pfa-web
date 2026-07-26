import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/seanslar")({
  head: () => ({
    meta: [
      { title: "Seanslar — Birebir Danışmanlık | PFA" },
      {
        name: "description",
        content:
          "60 dakikalık online birebir PFA danışmanlık oturumları. Europe/Istanbul saati; hafta içi 10:00–18:00.",
      },
      { property: "og:title", content: "Seanslar — PFA" },
      { property: "og:description", content: "Birebir online PFA danışmanlık seansları." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/seanslar" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/seanslar" }],
  }),
  component: SessionsPage,
});

const SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

function nextWeekdays(n: number) {
  const days: Date[] = [];
  const d = new Date();
  while (days.length < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(d));
  }
  return days;
}

function SessionsPage() {
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dates = nextWeekdays(10);

  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Seanslar</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Birebir Danışmanlık</h1>
        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          Danışan, harita üzerindeki konumunu gördüğünde gelişimin sorumluluğunu
          sürdürülebilir biçimde almaya başlar. Amaç geçici rahatlama değil;
          işlevsel farkındalığa sahip, öz yeterli bireyler. 60 dakikalık birebir
          oturumlar online gerçekleşir.
        </p>
      </header>

      <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-lg border border-border">
        <div className="grid gap-px bg-border md:grid-cols-[1fr_1.4fr]">
          <aside className="bg-card p-8">
            <div className="text-xs uppercase tracking-[0.25em] text-accent">Hizmet</div>
            <h2 className="mt-3 font-serif text-2xl">Danışmanlık Oturumu</h2>
            <ul className="mt-6 space-y-3 text-sm text-foreground/80">
              <li>• 60 dakika</li>
              <li>• Online (Zoom bağlantısı)</li>
              <li>• Europe/Istanbul saati</li>
            </ul>
          </aside>

          <div className="bg-background p-8">
            {submitted ? (
              <div className="rounded-md border border-accent/50 bg-accent/10 p-6">
                <div className="font-serif text-xl">Rezervasyon talebi alındı.</div>
                <p className="mt-2 text-sm text-foreground/80">
                  {date} · {slot} — Ödeme sayfasına yönlendirileceksiniz.
                  (Ödeme entegrasyonu yakında etkinleştirilecek.)
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (date && slot) setSubmitted(true);
                }}
                className="grid gap-6"
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    1 · Tarih Seçin
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dates.map((d) => {
                      const key = d.toISOString().slice(0, 10);
                      const label = d.toLocaleDateString("tr-TR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      });
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setDate(key)}
                          className={`rounded-md border px-3 py-2 text-xs transition ${
                            date === key
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    2 · Saat Seçin
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SLOTS.map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setSlot(s)}
                        className={`rounded-md border px-3 py-2 text-xs transition ${
                          slot === s
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    3 · Bilgileriniz
                  </div>
                  <input
                    required
                    placeholder="Adınız Soyadınız"
                    className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                  />
                  <input
                    required
                    type="email"
                    placeholder="E-posta"
                    className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!date || !slot}
                  className="btn-primary hover:btn-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rezervasyon & Ödemeye Geç
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}