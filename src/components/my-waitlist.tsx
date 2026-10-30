import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMyWaitlist, updateMyWaitlist, cancelMyWaitlist } from "@/lib/waitlist.functions";
import { waitlistBookLabel, type WaitlistStatus } from "@/lib/waitlist";
import { PAYMENTS_LIVE } from "@/lib/payments-config";
import { WaitlistForm, type WaitlistEntry } from "@/components/waitlist-form";

const STEPS: Array<{ key: WaitlistStatus | "ready"; label: string }> = [
  { key: "waiting", label: "Talep alındı" },
  { key: "notified", label: "Ödeme açıldı" },
  { key: "converted", label: "Ödendi" },
  { key: "ready", label: "Kitabınız hazır" },
];

export function MyWaitlistTab() {
  const list = useServerFn(listMyWaitlist);
  const q = useQuery({ queryKey: ["my-waitlist"], queryFn: () => list() });
  const rows = q.data?.rows ?? [];
  const pct = q.data?.pct ?? 10;

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Yükleniyor…</div>;
  if (rows.length === 0)
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Henüz bir talebiniz yok.{" "}
        <Link to="/imzali-kitap" search={{ kaynak: "hesabim" }} className="text-accent">
          İsme imzalı nüshanızı ayırtın →
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm text-foreground/85">
        {PAYMENTS_LIVE
          ? <>Ödeme açıldı. Bekleme listesine özel <strong>%{pct} indiriminiz</strong> kitapta otomatik uygulanır.</>
          : <>Kitabınız ve talebiniz, ödeme entegrasyonumuz tamamlandığında buraya inecek. Bekleme listesine özel <strong>%{pct} indiriminiz</strong> süresiz tanımlı.</>}
      </div>
      {rows.map((r: any) => <WaitlistCard key={r.id} row={r} />)}
      <Link to="/imzali-kitap" search={{ kaynak: "hesabim" }} className="inline-block text-sm text-accent">
        + Bir kitap daha ayırt / hediye et
      </Link>
    </div>
  );
}

function WaitlistCard({ row }: { row: any }) {
  const qc = useQueryClient();
  const update = useServerFn(updateMyWaitlist);
  const cancel = useServerFn(cancelMyWaitlist);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<WaitlistEntry>({
    product_slug: row.product_slug,
    is_gift: row.is_gift,
    recipient_name: row.recipient_name ?? "",
    recipient_email: row.recipient_email ?? "",
    gift_note: row.gift_note ?? "",
    dedication_name: row.dedication_name ?? "",
  });
  const stepIdx = Math.max(0, STEPS.findIndex((s) => s.key === row.status));
  const editable = row.status === "waiting" || row.status === "notified";

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await update({ data: { id: row.id, entry } });
      await qc.invalidateQueries({ queryKey: ["my-waitlist"] });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }
  async function doCancel() {
    if (!confirm("Bu talebi iptal etmek istiyor musunuz?")) return;
    await cancel({ data: { id: row.id } });
    await qc.invalidateQueries({ queryKey: ["my-waitlist"] });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-serif text-lg text-primary">{waitlistBookLabel(row.product_slug)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            İsme imzalı dijital nüsha · {new Date(row.created_at).toLocaleDateString("tr-TR")}
          </div>
        </div>
        {editable && !editing && (
          <div className="flex gap-3 text-xs">
            <button type="button" className="text-accent underline underline-offset-4" onClick={() => setEditing(true)}>Düzenle</button>
            <button type="button" className="text-muted-foreground underline underline-offset-4" onClick={doCancel}>İptal et</button>
          </div>
        )}
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s.key} className="text-center">
            <div className={`mx-auto h-1.5 rounded-full ${i <= stepIdx ? "bg-accent" : "bg-muted"}`} />
            <div className={`mt-1.5 text-[11px] ${i <= stepIdx ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
          </li>
        ))}
      </ol>

      {editing ? (
        <div className="mt-5">
          <WaitlistForm value={entry} onChange={setEntry} onSubmit={save} submitLabel="Kaydet" busy={busy} error={error} />
          <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={() => setEditing(false)}>Vazgeç</button>
        </div>
      ) : (
        <dl className="mt-4 grid gap-1 text-sm text-foreground/80">
          {row.dedication_name && <div><dt className="inline text-muted-foreground">İthaf: </dt><dd className="inline">{row.dedication_name}</dd></div>}
          {row.is_gift && (
            <div><dt className="inline text-muted-foreground">Hediye: </dt><dd className="inline">{row.recipient_name} ({row.recipient_email})</dd></div>
          )}
          {row.gift_note && <div><dt className="inline text-muted-foreground">Not: </dt><dd className="inline">“{row.gift_note}”</dd></div>}
        </dl>
      )}

      {PAYMENTS_LIVE && editable && !editing && (
        <Link to="/kitaplar" className="btn-primary hover:btn-primary-hover mt-4 inline-block">Şimdi öde</Link>
      )}
    </div>
  );
}
