import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyNewsletterStatus,
  subscribeMeToNewsletter,
  unsubscribeMeFromNewsletter,
} from "@/lib/newsletter-status.functions";

/**
 * Hesap menüsündeki durum duyarlı tek bülten eylemi.
 * E-posta istemciden gönderilmez; sunucu oturumdaki kullanıcının
 * kendi adresini kullanır. Geri bildirim menü içinde sessizce verilir;
 * abonelikten çıkış için menü içi kısa bir onay adımı vardır.
 */
export function NewsletterMenuItem({ className }: { className?: string }) {
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

  const base = className ?? "px-4 py-2 text-left text-sm hover:text-accent disabled:opacity-60";

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

  if (confirming) {
    return (
      <div className={`${base} space-y-1`}>
        <div className="text-xs text-muted-foreground">Emin misiniz?</div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={doUnsubscribe} className="text-sm text-accent">Evet, çık</button>
          <button type="button" onClick={() => setConfirming(false)} className="text-sm text-muted-foreground">Vazgeç</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={busy || subscribed === null}
        onClick={() => (subscribed ? setConfirming(true) : doSubscribe())}
        className={base}
      >
        {busy
          ? "İşleniyor…"
          : subscribed === null
            ? "Bülten"
            : subscribed
              ? "Bültenden Çık"
              : "Bültene Üye Ol"}
      </button>
      {note && <div className="px-4 pb-2 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}