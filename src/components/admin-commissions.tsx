// Admin: Cari & Ekstreler — komisyon tahakkukları ve aylık ekstreler.
// Tahakkuk hesaplaması veritabanında (handle_order_paid) yapılır; bu ekran
// yalnızca okur ve ekstre yaşam döngüsünü yönetir.
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCommissionOverview,
  getPractitionerCommissionDetail,
  generateCommissionStatements,
  setStatementStatus,
} from "@/lib/admin.functions";

function fmtMoney(cents: number, currency: string) {
  const cur = (currency || "usd").toUpperCase();
  return `${(cents / 100).toFixed(2)} ${cur}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR");
}

function previousMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const STATUS_LABEL: Record<string, string> = {
  taslak: "Taslak",
  fatura_bekleniyor: "Fatura bekleniyor",
  odemeye_hazir: "Ödemeye hazır",
  odendi: "Ödendi",
};

const LEDGER_STATUS_LABEL: Record<string, string> = {
  tahakkuk: "Tahakkuk",
  ekstreye_alindi: "Ekstreye alındı",
  odendi: "Ödendi",
};

export function AdminCommissions() {
  const fetchOverview = useServerFn(getCommissionOverview);
  const fetchDetail = useServerFn(getPractitionerCommissionDetail);
  const doGenerate = useServerFn(generateCommissionStatements);
  const doStatus = useServerFn(setStatementStatus);

  const defaults = useMemo(previousMonthRange, []);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [periodTotals, setPeriodTotals] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<Record<string, number>>({});
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ledger: any[]; statements: any[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOverview({ data: { period_start: start, period_end: end } });
      setRows(res.rows);
      setPeriodTotals(res.periodTotals);
      setRates(res.rates);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Veriler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, start, end]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (userId: string) => {
    if (openUser === userId) {
      setOpenUser(null);
      setDetail(null);
      return;
    }
    setOpenUser(userId);
    setDetail(null);
    try {
      setDetail(await fetchDetail({ data: { user_id: userId } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detay alınamadı.");
    }
  };

  const generate = async () => {
    if (!confirm(`${start} – ${end} dönemi için ekstreler oluşturulsun mu?`)) return;
    try {
      const res = await doGenerate({ data: { period_start: start, period_end: end } });
      toast.success(`${res.created} ekstre oluşturuldu.`);
      await load();
      if (openUser) setDetail(await fetchDetail({ data: { user_id: openUser } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ekstre oluşturulamadı.");
    }
  };

  const act = async (statementId: string, action: "fatura_alindi" | "odendi") => {
    try {
      await doStatus({ data: { statement_id: statementId, action } });
      toast.success("Güncellendi.");
      await load();
      if (openUser) setDetail(await fetchDetail({ data: { user_id: openUser } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Güncellenemedi.");
    }
  };

  const ekstreGunu = rates["takvim.ekstre_gunu"] ?? 8;
  const faturaSon = rates["takvim.fatura_penceresi_bitis"] ?? 15;
  const havaleGunu = rates["takvim.havale_gunu"] ?? 22;

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Ekstreler her ayın {ekstreGunu}'inde kesilir, fatura için son gün {faturaSon}'i,
        ödeme {havaleGunu}'sinde yapılır. Komisyon oranları Fiyat &amp; Oran Merkezi'nden
        okunur (Practitioner %{rates["komisyon.practitioner"] ?? 25}, Fellow %
        {rates["komisyon.fellow"] ?? 50}).
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Dönem başı</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Dönem sonu</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          Yenile
        </Button>
        <Button onClick={() => void generate()}>Ekstre Oluştur</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.keys(periodTotals).length === 0 ? (
          <div className="text-sm text-muted-foreground">Bu dönemde tahakkuk yok.</div>
        ) : (
          Object.entries(periodTotals).map(([cur, cents]) => (
            <div key={cur} className="rounded-lg border border-border px-4 py-3">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Dönem içi tahakkuk
              </div>
              <div className="text-lg">{fmtMoney(cents, cur)}</div>
            </div>
          ))
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Uygulayıcı</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Referans</TableHead>
            <TableHead>Komisyon Alacağı (bekleyen)</TableHead>
            <TableHead>Son ekstre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                Yükleniyor…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                Pro hesap yok.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <Fragment key={r.user_id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => void openDetail(r.user_id)}
                >
                  <TableCell className="text-xs">
                    {r.full_name || r.email || r.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.tier === "fellow" ? "Fellow" : "Practitioner"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.referral_code ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {Object.keys(r.pending_by_currency).length === 0
                      ? "—"
                      : Object.entries(r.pending_by_currency)
                          .map(([c, v]) => fmtMoney(v as number, c))
                          .join(" · ")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.last_statement
                      ? `${STATUS_LABEL[r.last_statement.status] ?? r.last_statement.status} · ${fmtMoney(r.last_statement.total_amount_cents, r.last_statement.currency)}`
                      : "—"}
                  </TableCell>
                </TableRow>
                {openUser === r.user_id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/30">
                      {!detail ? (
                        <div className="text-xs text-muted-foreground">Yükleniyor…</div>
                      ) : (
                        <div className="space-y-5 py-2">
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">
                              Fatura bilgileri
                            </div>
                            {!detail.billing ? (
                              <div className="text-xs text-muted-foreground">
                                Uygulayıcı fatura bilgisi girmemiş.
                              </div>
                            ) : (
                              <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs md:grid-cols-2">
                                <div>Ünvan: {detail.billing.fatura_unvani || "—"}</div>
                                <div>IBAN: {detail.billing.iban || "—"}</div>
                                <div>Vergi no: {detail.billing.vergi_no || "—"}</div>
                                <div>Vergi dairesi: {detail.billing.vergi_dairesi || "—"}</div>
                                <div className="md:col-span-2">Adres: {detail.billing.adres || "—"}</div>
                              </div>
                            )}
                          </div>
                          <div>

                            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">
                              Ekstreler
                            </div>
                            {detail.statements.length === 0 ? (
                              <div className="text-xs text-muted-foreground">Ekstre yok.</div>
                            ) : (
                              <div className="space-y-2">
                                {detail.statements.map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-xs"
                                  >
                                    <span>
                                      {st.period_start} – {st.period_end} ·{" "}
                                      {fmtMoney(st.total_amount_cents, st.currency)} ·{" "}
                                      {STATUS_LABEL[st.status] ?? st.status}
                                      {st.fatura_alindi_at
                                        ? ` · fatura ${fmtDate(st.fatura_alindi_at)}`
                                        : ""}
                                      {st.odeme_tarihi ? ` · ödeme ${fmtDate(st.odeme_tarihi)}` : ""}
                                    </span>
                                    <span className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={st.status === "odendi" || !!st.fatura_alindi_at}
                                        onClick={() => void act(st.id, "fatura_alindi")}
                                      >
                                        Fatura Alındı
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={st.status === "odendi"}
                                        onClick={() => void act(st.id, "odendi")}
                                      >
                                        Ödendi İşaretle
                                      </Button>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">
                              Komisyon geçmişi
                            </div>
                            {detail.ledger.length === 0 ? (
                              <div className="text-xs text-muted-foreground">Kayıt yok.</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Ürün</TableHead>
                                    <TableHead>Brüt</TableHead>
                                    <TableHead>Oran</TableHead>
                                    <TableHead>Komisyon</TableHead>
                                    <TableHead>Durum</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {detail.ledger.map((l) => (
                                    <TableRow key={l.id}>
                                      <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                                      <TableCell className="text-xs">{l.product_slug ?? "—"}</TableCell>
                                      <TableCell className="text-xs">
                                        {fmtMoney(l.gross_amount_cents, l.currency)}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        %{Number(l.commission_rate_pct)}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {fmtMoney(l.commission_amount_cents, l.currency)}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {LEDGER_STATUS_LABEL[l.status] ?? l.status}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
