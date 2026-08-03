import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyNewsletterStatus,
  subscribeMeToNewsletter,
  unsubscribeMeFromNewsletter,
} from "@/lib/newsletter-status.functions";

/**
 * Hesap içi bülten durumu ve tek tıkla açma/kapama. Aynı sunucu çekirdeğini
 * kullandığı için e-postadaki "Abonelikten ayrıl" bağlantısıyla birebir aynı
 * sonucu verir (global çıkış + kalıcı bastırma).
 */
export function NewsletterPreferences() {
  const status = useServerFn(getMyNewsletterStatus);
  const subscribeMe = useServerFn(subscribeMeToNewsletter);
  const unsubscribeMe = useServerFn(unsubscribeMeFromNewsletter);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await status({});
      setSubscribed(Boolean(r.subscribed));
      setConfirmed(Boolean(r.confirmed));
    } catch {
      setErr("Bülten durumu okunamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function onSubscribe() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await subscribeMe({});
      setMsg(
        r.state === "confirmed"
          ? "Aboneliğiniz etkin."
          : r.emailSent
            ? "Onay e-postası gönderildi; bağlantıya tıklayınca abonelik başlar."
            : "Kaydınız alındı ancak onay e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.",
      );
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnsubscribe() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await unsubscribeMe({});
      setMsg("Bülten aboneliğiniz kapatıldı. Bundan sonra bülten göndermeyeceğiz.");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="bulten" className="rounded-lg border border-border bg-card p-6">
      <div className="text-xs tracking-[0.25em] text-accent">BÜLTEN</div>
      <h2 className="mt-2 font-serif text-xl">PFA Bülteni</h2>
      <p className="mt-2 text-sm text-foreground/75">
        Ayda bir e-posta: kitaptan bölümler ve yeni blog yazılarından seçkiler.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-foreground/80">Durum:</span>
        <span className="rounded-full border border-border px-3 py-1 text-xs">
          {loading
            ? "Yükleniyor…"
            : subscribed
              ? confirmed ? "Abone (onaylı)" : "Onay bekliyor"
              : "Abone değil"}
        </span>
      </div>

      {!loading && (
        <div className="mt-4 flex flex-wrap gap-3">
          {subscribed ? (
            <button type="button" onClick={onUnsubscribe} disabled={busy}
              className="rounded-md border border-border px-4 py-2 text-sm transition hover:border-destructive hover:text-destructive disabled:opacity-60">
              {busy ? "…" : "Abonelikten ayrıl"}
            </button>
          ) : (
            <button type="button" onClick={onSubscribe} disabled={busy}
              className="btn-primary disabled:opacity-60">
              {busy ? "…" : "Bültene abone ol"}
            </button>
          )}
          {!confirmed && subscribed && (
            <button type="button" onClick={onSubscribe} disabled={busy}
              className="rounded-md border border-border px-4 py-2 text-sm transition hover:border-foreground disabled:opacity-60">
              Onay e-postasını yeniden gönder
            </button>
          )}
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
      {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
    </div>
  );
}
