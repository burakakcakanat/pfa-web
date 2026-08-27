import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getMySessions, requestSessionTime } from "@/lib/session-requests.functions";
import {
  SESSION_STATUS_LABEL_TR,
  type MySessionsView,
} from "@/lib/session-requests";
import { SessionSlotPicker } from "@/components/session-slot-picker";

const BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-muted text-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

/** Hesabım → Seanslarım: credits, requests and their status. */
export function MySessionsTab() {
  const fetchView = useServerFn(getMySessions);
  const requestTime = useServerFn(requestSessionTime);
  const [view, setView] = useState<MySessionsView | null>(null);
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchView()
      .then(setView)
      .catch(() => setView(null));
  }, [fetchView]);
  useEffect(load, [load]);

  async function submit() {
    setErr(null);
    setMsg(null);
    if (!slot.trim()) {
      setErr("Tercih ettiğiniz zamanı seçin.");
      return;
    }
    setBusy(true);
    try {
      await requestTime({ data: { preferred_slot: slot } });
      setMsg("Talebiniz alındı. Zaman teyidi e-posta ile bildirilecek.");
      setSlot("");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Talep gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (!view) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="font-serif text-xl">Seans Hakkı</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Kalan: <strong className="text-foreground">{view.credits_remaining}</strong> · Toplam{" "}
          {view.credits_total} · Kullanılan {view.credits_used}
        </p>
        {view.credits_remaining > 0 ? (
          <div className="mt-5 space-y-3">
            {/* FUTURE: when practitioner booking ships, a practitioner selector
                appears here and the slots below are filtered by that choice. */}
            <SessionSlotPicker value={slot} onChange={setSlot} locale="tr" />
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="btn-primary disabled:opacity-60"
            >
              {busy ? "Gönderiliyor…" : "Bu zamanı talep et"}
            </button>
            <p className="text-xs text-muted-foreground">
              Seçtiğiniz zaman bir tercihtir; randevu onayı e-posta ile ayrıca iletilir.
            </p>
            {msg && <p className="text-xs text-accent">{msg}</p>}
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Kullanılabilir seans hakkınız yok.{" "}
            <Link to="/seanslar" className="text-accent">
              Seans talebi oluştur →
            </Link>
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4 font-serif text-lg">Seans taleplerim</div>
        {view.requests.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Henüz bir seans talebiniz yok.</div>
        ) : (
          <ul className="divide-y divide-border">
            {view.requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <div className="font-medium">{r.preferred_slot || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    Talep: {new Date(r.created_at).toLocaleString("tr-TR")}
                    {r.confirmed_at
                      ? ` · Onaylanan zaman bildirildi: ${new Date(r.confirmed_at).toLocaleString("tr-TR")}`
                      : ""}
                  </div>
                  {r.admin_note ? (
                    <div className="mt-1 text-xs text-muted-foreground">{r.admin_note}</div>
                  ) : null}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[r.status]}`}>
                  {SESSION_STATUS_LABEL_TR[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
