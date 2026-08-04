import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyNewsletterStatus,
  subscribeMeToNewsletter,
  unsubscribeMeFromNewsletter,
} from "@/lib/newsletter-status.functions";

/**
 * Tek satırlık, kompakt bülten kontrolü. Uygulamada bültene abone olma /
 * çıkma işleminin tek yeri (e-postadaki token bağlantısı hariç).
 * E-posta istemciden gönderilmez; sunucu oturumdaki kullanıcının adresini kullanır.
 */
export function NewsletterRow() {
  const status = useServerFn(getMyNewsletterStatus);
  const subscribeMe = useServerFn(subscribeMeToNewsletter);
  const unsubscribeMe = useServerFn(unsubscribeMeFromNewsletter);

  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    status({})
      .then((r) => { if (alive) setSubscribed(Boolean(r.subscribed)); })
      .catch(() => { if (alive) setSubscribed(null); });
    return () => { alive = false; };
  }, [status]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  const doSubscribe = async () => {
    setBusy(true);
    try {
      const r = await subscribeMe({});
      setSubscribed(true);
      setNote(r.state === "confirmed" ? "Aboneliğiniz etkin." : "Onay e-postası gönderildi.");
    } catch {
      setNote("İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const doUnsubscribe = async () => {
    setBusy(true);
    setConfirming(false);
    try {
      await unsubscribeMe({});
      setSubscribed(false);
      setNote("Bülten aboneliğiniz kapatıldı.");
    } catch {
      setNote("İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="text-foreground/80">
          Bülten{" "}
          <span className="text-xs text-muted-foreground">
            · {subscribed === null ? "…" : subscribed ? "Kayıtlı" : "Kayıtlı değil"}
          </span>
        </div>
        {confirming ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Emin misiniz?</span>
            <button type="button" onClick={doUnsubscribe} className="text-accent">Evet, çık</button>
            <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground">Vazgeç</button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || subscribed === null}
            onClick={() => (subscribed ? setConfirming(true) : doSubscribe())}
            className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:border-foreground disabled:opacity-60"
          >
            {busy ? "…" : subscribed ? "Abonelikten çık" : "Üye ol"}
          </button>
        )}
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
