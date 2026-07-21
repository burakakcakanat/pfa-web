import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getGiftByToken, claimGift } from "@/lib/gifts.functions";

export const Route = createFileRoute("/hediye/$token")({
  head: () => ({
    meta: [
      { title: "Hediye Kitabınız — PFA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ClaimPage,
});

function ClaimPage() {
  const { token } = Route.useParams();
  const fetchGift = useServerFn(getGiftByToken);
  const doClaim = useServerFn(claimGift);
  const navigate = useNavigate();

  const [gift, setGift] =
    useState<Awaited<ReturnType<typeof getGiftByToken>> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetchGift({ data: { token } });
      setGift(res);
      setLoaded(true);
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
  }, [fetchGift, token]);

  async function onClaim() {
    setErr(null);
    setBusy(true);
    try {
      await doClaim({ data: { token } });
      navigate({ to: "/hesabim", search: { checkout: "success" } as never });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="container-page py-24 text-center text-sm text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-serif text-3xl">Geçersiz bağlantı</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Bu hediye bağlantısı geçerli değil. Bağlantıyı size gönderen kişiden doğrulamasını rica edin.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Hediyeniz</div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">{gift.product_name}</h1>
        <p className="mt-4 text-sm text-foreground/80">
          {gift.buyer_name ? <><strong>{gift.buyer_name}</strong> tarafından </> : "Sizin için "}
          hazırlanmış <em>imzalı kişisel bir nüsha</em>.
        </p>
        {gift.gift_note && (
          <blockquote className="mx-auto mt-6 max-w-md rounded-md border-l-2 border-accent bg-accent/5 px-5 py-3 text-left text-sm italic text-foreground/85">
            “{gift.gift_note}”
          </blockquote>
        )}

        <div className="mt-8 border-t border-border pt-6 text-sm">
          {gift.status === "claimed" ? (
            <div className="text-muted-foreground">
              Bu hediye daha önce alınmış.{" "}
              <Link to="/hesabim" className="text-accent underline">Hesabıma git →</Link>
            </div>
          ) : userEmail ? (
            <>
              <p className="text-foreground/80">
                <strong>{userEmail}</strong> hesabına bağlayarak E-Book'larım alanına ekleyeceğiz.
              </p>
              <button
                type="button"
                onClick={onClaim}
                disabled={busy}
                className="btn-primary mt-5 disabled:opacity-60"
              >
                {busy ? "..." : "Hediyeyi Al"}
              </button>
              {err && <div className="mt-3 text-xs text-destructive">{err}</div>}
            </>
          ) : (
            <>
              <p className="text-foreground/80">
                Hediyeyi almak için önce giriş yapın veya hesap oluşturun.
                Bu bağlantı, giriş yaptıktan sonra tekrar açıldığında kitabı hesabınıza ekleyecek.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Link
                  to="/auth"
                  search={{ redirect: `/hediye/${token}` } as never}
                  className="btn-primary"
                >
                  Giriş Yap / Kayıt Ol
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}