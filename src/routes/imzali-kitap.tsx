import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWaitlistPct, joinWaitlist } from "@/lib/waitlist.functions";
import { isWaitlistBook, WAITLIST_DEFAULT_PCT } from "@/lib/waitlist";
import { WaitlistForm, emptyEntry, type WaitlistEntry } from "@/components/waitlist-form";

const URL = "https://psychofunctionalanalysis.com/imzali-kitap";
const DRAFT_KEY = "pfa-waitlist-draft";

type Search = { kitap?: string; hediye?: string; kaynak?: string };

export const Route = createFileRoute("/imzali-kitap")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s.kitap === "string" ? { kitap: s.kitap } : {}),
    ...(s.hediye !== undefined ? { hediye: String(s.hediye) } : {}),
    ...(typeof s.kaynak === "string" ? { kaynak: s.kaynak } : {}),
  }),
  head: () => ({
    meta: [
      { title: "İsme İmzalı Kitap — Bekleme Listesi · PFA" },
      {
        name: "description",
        content: "İsme imzalı dijital nüshanızı ayırtın veya hediye edin. Bekleme listesine özel kitapta süresiz %10 indirim.",
      },
      { property: "og:title", content: "İsme İmzalı Kitap — Bekleme Listesi" },
      { property: "og:description", content: "Yerinizi ayırın; ödeme açıldığında kitabınız hesabınıza insin. Kitapta %10 indirim." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const join = useServerFn(joinWaitlist);
  const pctQ = useQuery({ queryKey: ["waitlist-pct"], queryFn: () => getWaitlistPct() });
  const pct = pctQ.data?.pct ?? WAITLIST_DEFAULT_PCT;
  const source = search.kaynak || "instagram";

  const [entry, setEntry] = useState<WaitlistEntry>(() =>
    emptyEntry(search.kitap && isWaitlistBook(search.kitap) ? search.kitap : "pfa-ebook-tr", search.hediye !== undefined),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Giriş sonrası dönüşte taslağı geri yükle.
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        setEntry(JSON.parse(raw));
      } catch {
        /* yok say */
      }
    }
  }, []);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(entry));
        navigate({ to: "/auth", search: { redirect: `/imzali-kitap?kaynak=${encodeURIComponent(source)}` } });
        return;
      }
      await join({ data: { entry, source } });
      sessionStorage.removeItem(DRAFT_KEY);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container mx-auto max-w-2xl px-5 py-14 md:py-20">
      {done ? (
        <div className="rounded-lg border border-accent/40 bg-card p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-accent">Yeriniz ayrıldı</p>
          <h1 className="mt-3 font-serif text-3xl text-primary md:text-4xl">Hoş geldiniz.</h1>
          <p className="mx-auto mt-4 max-w-md text-foreground/80">
            İsme imzalı nüshanız için talebiniz alındı. Ödeme sistemimiz tamamlandığında kitabınız hesabınıza inecek ve size
            haber vereceğiz. Bekleme listesine özel <strong>%{pct} indiriminiz</strong> süresiz olarak tanımlandı.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/hesabim" search={{ tab: "waitlist" }} className="btn-primary hover:btn-primary-hover">
              Taleplerime git
            </Link>
            <button type="button" className="btn-ghost text-sm underline underline-offset-4" onClick={() => { setEntry(emptyEntry()); setDone(false); }}>
              Bir kitap daha ayırt / hediye et
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-accent">Bekleme listesi · Kitapta %{pct} indirim</p>
          <h1 className="mt-3 font-serif text-4xl text-primary md:text-5xl">İsme imzalı nüshanızı ayırtın</h1>
          <p className="mt-4 text-foreground/80">
            Kartlı ödeme altyapımızı tamamlıyoruz. Şimdi yerinizi ayırın: kendiniz için ya da hediye olarak. Ödeme
            açıldığında güncel fiyattan <strong>%{pct} indirimle</strong> tek adımda tamamlarsınız; kitabınız hesabınıza iner.
          </p>
          <ul className="mt-5 space-y-1.5 text-sm text-foreground/75">
            <li>· Şimdi ödeme yok, kart bilgisi istenmez.</li>
            <li>· İndirim süresiz; kitapta geçerli.</li>
            <li>· İthaf ve hediye bilgisini sonradan hesabınızdan değiştirebilirsiniz.</li>
          </ul>
          <div className="mt-8 rounded-lg border border-border bg-card p-5 md:p-7">
            <WaitlistForm
              value={entry}
              onChange={setEntry}
              onSubmit={submit}
              submitLabel="Yerimi ayır"
              busy={busy}
              error={error}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Devam etmek için hesabınıza giriş yapmanız istenir (Google ile tek tık).
            </p>
          </div>
        </>
      )}
    </main>
  );
}
