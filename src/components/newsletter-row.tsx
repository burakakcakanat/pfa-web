import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyNewsletterStatus,
  subscribeMeToNewsletter,
  unsubscribeMeFromNewsletter,
} from "@/lib/newsletter-status.functions";

/**
 * Hesap sekme çubuğunda yer alan tek eylemlik bülten kontrolü. Uygulamada
 * bültene abone olma / çıkma işleminin tek yeri (e-postadaki token bağlantısı
 * hariç). E-posta istemciden gönderilmez; sunucu oturumdaki kullanıcının
 * adresini kullanır.
 */
export function NewsletterTabAction() {
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

  // Sekmelerle aynı hizada durur ama bir bölüme girilecekmiş gibi görünmez:
  // alt çizgi yok, kesikli ince çerçeveli sessiz bir eylem.
  if (confirming) {
    return (
      <span className="-mb-px flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
        <span>Emin misiniz?</span>
        <button type="button" onClick={doUnsubscribe} disabled={busy} className="text-accent hover:underline disabled:opacity-60">
          Evet
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="hover:text-foreground">
          Vazgeç
        </button>
      </span>
    );
  }

  return (
    <span className="-mb-px flex items-center gap-2 py-1 pl-2">
      <button
        type="button"
        disabled={busy || subscribed === null}
        onClick={() => (subscribed ? setConfirming(true) : doSubscribe())}
        className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-60"
      >
        {busy ? "…" : subscribed === null ? "Bülten" : subscribed ? "Bültenden Çık" : "Bültene Üye Ol"}
      </button>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </span>
  );
}
