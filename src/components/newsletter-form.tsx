import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeNewsletter } from "@/lib/newsletter.functions";
import { supabase } from "@/integrations/supabase/client";

const SEGMENT_OPTIONS = [
  { value: "merakli", label: "Meraklı Okur" },
  { value: "profesyonel", label: "Profesyonel (psikolog, koç, danışman)" },
  { value: "kurumsal", label: "Kurumsal" },
] as const;

type Variant = "footer" | "banner";

const DISMISS_KEY = "pfa_newsletter_dismissed";

export function NewsletterForm({
  variant = "footer",
  source = "footer",
}: { variant?: Variant; source?: string }) {
  const subscribe = useServerFn(subscribeNewsletter);
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState<(typeof SEGMENT_OPTIONS)[number]["value"]>("merakli");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [checkedDismissal, setCheckedDismissal] = useState(variant !== "banner");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !email) setEmail(data.user.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Banner is a one-time invitation: once the visitor subscribes (or has
  // subscribed before on this device) it never reappears.
  useEffect(() => {
    if (variant !== "banner") return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setHidden(true);
    } catch { /* storage blocked */ }
    setCheckedDismissal(true);
  }, [variant]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!consent) {
      setErr("KVKK onayı gerekli.");
      return;
    }
    setStatus("loading");
    try {
      await subscribe({ data: { email, segment, consent, source, website } });
      setStatus("ok");
      if (variant === "banner") {
        try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
        window.setTimeout(() => setHidden(true), 2500);
      }
    } catch (e: any) {
      setStatus("err");
      setErr(e?.message ?? "Bir hata oluştu.");
    }
  }

  if (variant === "banner" && (hidden || !checkedDismissal)) return null;

  if (status === "ok") {
    return (
      <div className={variant === "banner"
        ? "mx-auto max-w-md rounded-md border border-accent/40 bg-accent/10 p-4 text-center text-sm text-foreground/85"
        : "rounded-md border border-accent/40 bg-accent/10 p-4 text-sm text-foreground/85"}>
        Aboneliğiniz alındı. Teşekkürler.
      </div>
    );
  }

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm";

  if (variant === "banner") {
    return (
      <form onSubmit={onSubmit} className="mx-auto grid max-w-md gap-2 rounded-lg border border-border bg-card/70 p-3">
        <div className="text-center text-[11px] tracking-[0.2em] text-accent">AYLIK BÜLTEN ÜYELİĞİ</div>
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          name="website"
          className="hidden"
          aria-hidden="true"
        />
        <input
          type="email"
          required
          placeholder="E-posta adresi"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
        <select value={segment} onChange={(e) => setSegment(e.target.value as any)} className={inputCls}>
          {SEGMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="btn-primary h-9 whitespace-nowrap" disabled={status === "loading"}>
          {status === "loading" ? "Gönderiliyor…" : "Abone Ol"}
        </button>
        <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          <span>
            E-posta iletişimi için KVKK kapsamında onay veriyorum.
            {" "}
            <a href="/kvkk" className="underline hover:text-accent">Aydınlatma metni</a>
          </span>
        </label>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 text-sm">
      <div className="font-serif text-xl">PFA Bülteni</div>
      <p className="text-xs text-muted-foreground">
        Bilinç haritasından seçkiler, yeni içerik ve etkinlik duyuruları.
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
      <input
        type="email"
        required
        placeholder="E-posta adresi"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />
      <select value={segment} onChange={(e) => setSegment(e.target.value as any)} className={inputCls}>
        {SEGMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          E-posta iletişimi için KVKK onayı veriyorum.
          {" "}
          <a href="/kvkk" className="underline hover:text-accent">Aydınlatma</a>
        </span>
      </label>
      <button className="btn-primary" disabled={status === "loading"}>
        {status === "loading" ? "Gönderiliyor…" : "Abone Ol"}
      </button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </form>
  );
}