import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminListWaitlist, adminNotifyWaitlist } from "@/lib/waitlist.functions";
import { WAITLIST_BOOKS, WAITLIST_STATUS_LABEL, waitlistBookLabel, type WaitlistStatus } from "@/lib/waitlist";
import { PAYMENTS_LIVE } from "@/lib/payments-config";

export function AdminWaitlist() {
  const list = useServerFn(adminListWaitlist);
  const notify = useServerFn(adminNotifyWaitlist);
  const q = useQuery({ queryKey: ["admin-waitlist"], queryFn: () => list() });
  const [book, setBook] = useState("all");
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const rows = q.data?.rows ?? [];

  const filtered = useMemo(
    () =>
      rows.filter(
        (r: any) =>
          (book === "all" || r.product_slug === book) &&
          (status === "all" || (status === "active" ? r.status !== "cancelled" : r.status === status)),
      ),
    [rows, book, status],
  );
  const active = rows.filter((r: any) => r.status !== "cancelled");

  function exportCsv() {
    const head = ["tarih", "ad", "email", "kitap", "ithaf", "hediye", "alici_ad", "alici_email", "not", "kaynak", "durum"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = filtered.map((r: any) =>
      [r.created_at, r.full_name, r.email, r.product_slug, r.dedication_name, r.is_gift ? "evet" : "hayir", r.recipient_name, r.recipient_email, r.gift_note, r.source, r.status].map(esc).join(","),
    );
    const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bekleme-listesi.csv";
    a.click();
  }

  async function doNotify() {
    if (!confirm("Bekleyen herkese 'ödeme açıldı' e-postası gönderilsin mi? (Her kişiye bir kez gider.)")) return;
    setBusy(true);
    try {
      const r = await notify();
      toast.success(`${r.sent} kişiye bildirim gönderildi.`);
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Toplam aktif talep" value={active.length} />
        {WAITLIST_BOOKS.map((b) => (
          <Stat key={b.slug} label={b.label} value={active.filter((r: any) => r.product_slug === b.slug).length} />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Hediye: {active.filter((r: any) => r.is_gift).length} · Instagram: {active.filter((r: any) => r.source === "instagram").length}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={book} onChange={(e) => setBook(e.target.value)}>
          <option value="all">Tüm kitaplar</option>
          {WAITLIST_BOOKS.map((b) => <option key={b.slug} value={b.slug}>{b.label}</option>)}
        </select>
        <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Aktif</option>
          <option value="all">Tümü</option>
          {Object.entries(WAITLIST_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="button" onClick={exportCsv} className="rounded-md border border-border px-3 py-1.5 text-sm">CSV indir</button>
        <button
          type="button"
          onClick={doNotify}
          disabled={!PAYMENTS_LIVE || busy}
          title={PAYMENTS_LIVE ? "" : "Kartlı ödeme açılınca aktif olur"}
          className="btn-primary ml-auto text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ödeme açıldı — herkese bildir
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tarih</th><th className="px-3 py-2">Kişi</th><th className="px-3 py-2">Kitap</th>
              <th className="px-3 py-2">İthaf</th><th className="px-3 py-2">Hediye</th><th className="px-3 py-2">Kaynak</th><th className="px-3 py-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">{q.isLoading ? "Yükleniyor…" : "Talep yok."}</td></tr>
            )}
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("tr-TR")}</td>
                <td className="px-3 py-2">{r.full_name || "—"}<div className="text-xs text-muted-foreground">{r.email}</div></td>
                <td className="px-3 py-2">{waitlistBookLabel(r.product_slug)}</td>
                <td className="px-3 py-2">{r.dedication_name || "—"}</td>
                <td className="px-3 py-2">{r.is_gift ? <>{r.recipient_name}<div className="text-xs text-muted-foreground">{r.recipient_email}</div>{r.gift_note && <div className="text-xs italic text-muted-foreground">“{r.gift_note}”</div>}</> : "—"}</td>
                <td className="px-3 py-2">{r.source}</td>
                <td className="px-3 py-2">{WAITLIST_STATUS_LABEL[r.status as WaitlistStatus] ?? r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl text-primary">{value}</div>
    </div>
  );
}
