import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeNewsletter } from "@/lib/newsletter.functions";
import { getMyNewsletterStatus } from "@/lib/newsletter-status.functions";
import { supabase } from "@/integrations/supabase/client";

const SUBSCRIBED_KEY = "pfa_newsletter_subscribed";

/**
 * Compact, single newsletter block used on every surface (blog/content hub,
 * assessment result CTA, footer). No variants — one component, one layout.
 * Hidden entirely for visitors already known to be subscribed.
 */
const COPY = {
  tr: {
    title: "PFA Bülteni",
    blurb: "Ayda bir e-posta: kitaptan bölümler ve yeni blog yazılarından seçkiler.",
    emailLabel: "E-posta adresi",
    submit: "Abone Ol",
    submitting: "Gönderiliyor…",
    consentNeeded: "KVKK onayı gerekli.",
    genericError: "Bir hata oluştu.",
    consentPrefix: "E-posta iletişimi için KVKK kapsamında onay veriyorum.",
    consentLink: "Aydınlatma metni",
    consentHref: "/gizlilik",
    okPending:
      "Teşekkürler — onay e-postası gönderildi. Aboneliğin başlaması için e-postadaki bağlantıya tıklayın.",
    okDone: "Teşekkürler — aboneliğiniz etkin; ilk sayı e-posta adresinize gönderildi.",
  },
  en: {
    title: "PFA newsletter",
    blurb: "One email a month: excerpts from the book and selected new articles.",
    emailLabel: "Email address",
    submit: "Subscribe",
    submitting: "Sending…",
    consentNeeded: "Please confirm your consent.",
    genericError: "Something went wrong.",
    consentPrefix: "I consent to receiving email communication.",
    consentLink: "Privacy policy",
    consentHref: "/en/privacy",
    okPending:
      "Thank you — a confirmation email is on its way. Click the link in it to start your subscription.",
    okDone: "Thank you — your subscription is active; the first issue has been sent to your inbox.",
  },
} as const;

export function NewsletterForm({
  source = "footer",
  locale = "tr",
}: {
  source?: string;
  locale?: "tr" | "en";
}) {
  const t = COPY[locale];
  const subscribe = useServerFn(subscribeNewsletter);
  const status = useServerFn(getMyNewsletterStatus);

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "loading" | "ok">("idle");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (window.localStorage.getItem(SUBSCRIBED_KEY) === "1") {
          if (alive) { setSuppressed(true); setReady(true); }
          return;
        }
      } catch { /* storage blocked */ }

      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (data.user) {
        if (data.user.email) setEmail(data.user.email);
        try {
          const res = await status({});
          if (!alive) return;
          if (res.subscribed) {
            setSuppressed(true);
            setReady(true);
            return;
          }
        } catch { /* status unknown — show the box */ }
      }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!consent) {
      setErr(t.consentNeeded);
      return;
    }
    setState("loading");
    try {
      const res = await subscribe({ data: { email, segment: "merakli", consent, source, website } });
      setState("ok");
      setPending(res?.state !== "confirmed");
      try { window.localStorage.setItem(SUBSCRIBED_KEY, "1"); } catch { /* ignore */ }
      window.setTimeout(() => setCollapsed(true), 8000);
    } catch (e: unknown) {
      setState("idle");
      setErr(e instanceof Error ? e.message : t.genericError);
    }
  }

  if (!ready || suppressed) return null;

  return (
    <div
      ref={wrapRef}
      className="grid w-full min-w-0 max-w-full overflow-hidden transition-all duration-500 ease-in-out"
      style={{ gridTemplateRows: collapsed ? "0fr" : "1fr", opacity: collapsed ? 0 : 1 }}
      aria-hidden={collapsed}
    >
      <div className="min-h-0">
        {state === "ok" ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-foreground/85">
            {pending ? t.okPending : t.okDone}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card/70 p-4">
            <div className="font-serif text-lg leading-tight">{t.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t.blurb}
            </p>

            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              name="website"
              className="hidden"
              aria-hidden="true"
            />

            <div className="mt-3 flex w-full min-w-0 flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                placeholder={t.emailLabel}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label={t.emailLabel}
                className="w-full min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button className="btn-primary h-10 shrink-0 whitespace-nowrap px-4" disabled={state === "loading"}>
                {state === "loading" ? t.submitting : t.submit}
              </button>
            </div>

            <label className="mt-2 flex items-start gap-2 break-words text-[11px] leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {t.consentPrefix}{" "}
                <a href={t.consentHref} className="underline hover:text-accent">{t.consentLink}</a>
              </span>
            </label>

            {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
