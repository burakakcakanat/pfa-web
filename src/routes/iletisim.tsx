import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/iletisim")({
  head: () => ({
    meta: [
      { title: "İletişim — PFA" },
      { name: "description", content: "PFA ile iletişime geçin." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="container-page py-20">
      <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-accent">İletişim</div>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Bize yazın</h1>
          <p className="mt-6 text-base leading-relaxed text-foreground/80">
            Sorularınız, işbirliği önerileriniz veya basın talepleriniz için formu
            doldurabilir ya da doğrudan e-posta gönderebilirsiniz.
          </p>
          <dl className="mt-10 space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                E-posta
              </dt>
              <dd className="mt-1 font-serif text-lg">info@psychofunctionalanalysis.com</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Sosyal
              </dt>
              <dd className="mt-1 flex gap-4 text-foreground/80">
                <a href="#" className="hover:text-accent">Instagram</a>
                <a href="#" className="hover:text-accent">LinkedIn</a>
                <a href="#" className="hover:text-accent">YouTube</a>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          {sent ? (
            <div className="rounded-md border border-accent/50 bg-accent/10 p-6 text-center">
              <div className="font-serif text-xl">Mesajınız iletildi.</div>
              <p className="mt-2 text-sm text-foreground/80">
                En kısa sürede dönüş yapacağız.
              </p>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
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
              <input
                placeholder="Konu"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <textarea
                required
                rows={5}
                placeholder="Mesajınız"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <button className="btn-primary hover:btn-primary-hover justify-self-start">
                Gönder
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}