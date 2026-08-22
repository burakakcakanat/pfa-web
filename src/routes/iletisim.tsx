import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/iletisim")({
  head: () => ({
    meta: [
      { title: "İletişim — PFA" },
      { name: "description", content: "PFA ile iletişime geçin." },
      { property: "og:title", content: "İletişim — PFA" },
      { property: "og:description", content: "PFA ile iletişime geçin." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/iletisim" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/iletisim" }],
  }),
  component: ContactPage,
});

const SUBJECTS = [
  "Genel Soru",
  "Uygulayıcı Programı",
  "Kurumsal Program Lisansı",
  "Ülke Lisansı",
  "Basın/Medya",
  "Teknik Destek",
  "Diğer",
] as const;

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = useServerFn(submitContactMessage);
  return (
    <div className="container-page py-20">
      <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2">
        <div>
          <div className="text-xs tracking-[0.3em] text-accent">İLETİŞİM</div>
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
              onSubmit={async (e) => {
                e.preventDefault();
                setErr(null);
                setBusy(true);
                const fd = new FormData(e.currentTarget);
                try {
                  await send({
                    data: {
                      full_name: String(fd.get("full_name") ?? ""),
                      email: String(fd.get("email") ?? ""),
                      subject: String(fd.get("subject") ?? ""),
                      message: String(fd.get("message") ?? ""),
                      website_hp: String(fd.get("website_hp") ?? ""),
                    },
                  });
                  setSent(true);
                } catch (e2: any) {
                  setErr(e2?.message ?? "Bir hata oluştu.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <input
                required
                name="full_name"
                placeholder="Adınız Soyadınız"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                name="email"
                placeholder="E-posta"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <select
                required
                name="subject"
                defaultValue=""
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Konu seçin
                </option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <textarea
                required
                name="message"
                rows={5}
                placeholder="Mesajınız"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <button disabled={busy} className="btn-primary hover:btn-primary-hover justify-self-start disabled:opacity-60">
                {busy ? "Gönderiliyor…" : "Gönder"}
              </button>
              {err && <span className="text-xs text-destructive">{err}</span>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}