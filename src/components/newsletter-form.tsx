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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !email) setEmail(data.user.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (e: any) {
      setStatus("err");
      setErr(e?.message ?? "Bir hata oluştu.");
    }
  }

  if (status === "ok") {
    return (
      <div className={variant === "banner"
        ? "rounded-md border border-accent/40 bg-accent/10 p-4 text-sm text-foreground/85"
        : "rounded-md border border-accent/40 bg-accent/10 p-4 text-sm text-foreground/85"}>
        Aboneliğiniz alındı. Teşekkürler.
      </div>
    );
  }

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm";

  if (variant === "banner") {
    return (
      <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-border bg-card/70 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          name="website"
          className="hidden"
          aria-hidden="true"
        />
        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">E-posta</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs tracking-[0.2em] text-muted-foreground">SİZİ EN İYİ TANIMLAYAN</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value as any)} className={inputCls}>
            {SEGMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button className="btn-primary h-10 whitespace-nowrap" disabled={status === "loading"}>
          {status === "loading" ? "Gönderiliyor…" : "Abone Ol"}
        </button>
        <label className="col-span-full flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          <span>
            E-posta iletişimi için KVKK kapsamında onay veriyorum.
            {" "}
            <a href="/kvkk" className="underline hover:text-accent">Aydınlatma metni</a>
          </span>
        </label>
        {err && <p className="col-span-full text-xs text-destructive">{err}</p>}
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