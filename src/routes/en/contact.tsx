import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitContactMessage } from "@/lib/contact.functions";
import { CONTACT_COPY } from "@/content/en-pages";
import { SITE_URL, alternateLinksForEn } from "@/lib/i18n";

const C = CONTACT_COPY.en;
const URL = `${SITE_URL}/en/contact`;
const EMAIL = "info@psychofunctionalanalysis.com";

export const Route = createFileRoute("/en/contact")({
  head: () => ({
    meta: [
      { title: "Contact — PFA" },
      {
        name: "description",
        content:
          "Get in touch with Psycho-Functional Analysis: questions about the books, the PFA Assessment, collaborations or press enquiries.",
      },
      { property: "og:title", content: "Contact — PFA" },
      { property: "og:description", content: "Write to the Psycho-Functional Analysis team." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }, ...alternateLinksForEn("/en/contact")],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = useServerFn(submitContactMessage);

  return (
    <div className="container-page py-20">
      <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-accent">{C.eyebrow}</div>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">{C.h1}</h1>
          <p className="mt-6 text-base leading-relaxed text-foreground/80">{C.lede}</p>
          <dl className="mt-10 space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {C.emailLabel}
              </dt>
              <dd className="mt-1 font-serif text-lg">
                <a href={`mailto:${EMAIL}`} className="hover:text-accent">
                  {EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          {sent ? (
            <div className="rounded-md border border-accent/50 bg-accent/10 p-6 text-center">
              <div className="font-serif text-xl">{C.sentTitle}</div>
              <p className="mt-2 text-sm text-foreground/80">{C.sentBody}</p>
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
                      locale: "en",
                    },
                  });
                  setSent(true);
                } catch (e2) {
                  setErr(e2 instanceof Error ? e2.message : C.genericError);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <input
                required
                name="full_name"
                placeholder={C.fullName}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                name="email"
                placeholder={C.email}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                name="subject"
                placeholder={C.subject}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <textarea
                required
                name="message"
                rows={5}
                placeholder={C.message}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                type="text"
                name="website_hp"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <button
                disabled={busy}
                className="btn-primary hover:btn-primary-hover justify-self-start disabled:opacity-60"
              >
                {busy ? C.sending : C.send}
              </button>
              {err && <span className="text-xs text-destructive">{err}</span>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}