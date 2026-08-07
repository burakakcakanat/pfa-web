import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listAdminPurchaseInquiries,
  listFulfilOptions,
  fulfilInquiryFn,
  sendTransferInstructionsFn,
  updateAdminPurchaseInquiry,
} from "@/lib/purchase-inquiries.functions";
import {
  PURCHASE_KIND_LABEL,
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_ORDER,
  paymentReferenceFor,
  type AdminPurchaseInquiryRow,
  type PurchaseInquiryStatus,
} from "@/lib/purchase-inquiries";

const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** Quiet origin marker. TR is the default and stays unmarked to avoid noise. */
export function LocaleBadge({ locale }: { locale?: string | null }) {
  if (locale !== "en") return null;
  return (
    <span className="ml-2 inline-flex items-center rounded border border-accent/60 px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wider text-accent">
      EN
    </span>
  );
}

export function AdminPurchaseInquiries() {
  const list = useServerFn(listAdminPurchaseInquiries);
  const update = useServerFn(updateAdminPurchaseInquiry);
  const sendTransfer = useServerFn(sendTransferInstructionsFn);
  const loadOptions = useServerFn(listFulfilOptions);
  const fulfil = useServerFn(fulfilInquiryFn);
  const [rows, setRows] = useState<AdminPurchaseInquiryRow[]>([]);
  const [options, setOptions] = useState<Awaited<ReturnType<typeof listFulfilOptions>> | null>(
    null,
  );
  const [selKind, setSelKind] = useState<"product" | "bundle">("product");
  const [selSlug, setSelSlug] = useState("");
  const [selLang, setSelLang] = useState<"tr" | "en">("tr");
  const [fulfilling, setFulfilling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PurchaseInquiryStatus | "all">("all");
  const [localeFilter, setLocaleFilter] = useState<"all" | "tr" | "en">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [sending, setSending] = useState(false);
  const [notifyPaid, setNotifyPaid] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await list();
      setRows((r ?? []) as AdminPurchaseInquiryRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Talepler yüklenemedi");
    }
  }, [list]);
  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    loadOptions({ data: { book_lang: "tr" } })
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [loadOptions]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (statusFilter === "all" || r.status === statusFilter) &&
          (localeFilter === "all" || (r.locale ?? "tr") === localeFilter),
      ),
    [rows, statusFilter, localeFilter],
  );

  const opened = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => {
    setNote(opened?.admin_note ?? "");
    setNotifyPaid(true);
    const kind = opened?.fulfil_kind ?? "product";
    setSelKind(kind);
    setSelSlug(opened?.fulfil_slug ?? opened?.product_slug ?? "");
    setSelLang(opened?.fulfil_book_lang ?? (opened?.locale === "en" ? "en" : "tr"));
    const prefill =
      opened?.transfer_amount != null
        ? String(opened.transfer_amount)
        : opened?.selection_price_cents != null && opened.selection_price_cents > 0
          ? (opened.selection_price_cents / 100).toFixed(2)
          : opened?.catalogue_price_cents != null
            ? (opened.catalogue_price_cents / 100).toFixed(2)
            : "";
    setAmount(prefill);
    setCurrency(opened?.transfer_currency || "TRY");
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectionPriceCents = useMemo(() => {
    if (!options || !selSlug) return null;
    const pool = selKind === "bundle" ? options.bundles : options.products;
    return pool.find((o) => o.slug === selSlug)?.price_cents ?? null;
  }, [options, selKind, selSlug]);

  /** Selecting a product/bundle re-prices the transfer amount. */
  function pickSelection(kind: "product" | "bundle", slug: string) {
    setSelKind(kind);
    setSelSlug(slug);
    const pool = kind === "bundle" ? options?.bundles : options?.products;
    const price = pool?.find((o) => o.slug === slug)?.price_cents;
    if (price != null && price > 0) setAmount((price / 100).toFixed(2));
  }

  async function onFulfil() {
    if (!opened || !selSlug) return;
    setFulfilling(true);
    try {
      const res = await fulfil({
        data: {
          id: opened.id,
          fulfil_kind: selKind,
          fulfil_slug: selSlug,
          fulfil_book_lang: selLang,
          notify: true,
        },
      });
      if (res.pending_account) {
        toast.warning("Hesap bulunamadı — haklar kullanıcı kayıt olunca tanımlanacak.");
      } else if (res.already > 0 && res.granted.entries.length === res.already) {
        toast.info("Zaten tanımlıydı — yeni bir hak eklenmedi.");
      } else {
        toast.success("Haklar tanımlandı ve teslim e-postası gönderildi.");
      }
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Tanımlanamadı");
    } finally {
      setFulfilling(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  async function changeStatus(id: string, status: PurchaseInquiryStatus) {
    const current = rows.find((r) => r.id === id);
    if (current?.status === status) return; // idempotent — no redundant write
    try {
      await update({
        data: { id, status, ...(status === "paid" ? { notify: notifyPaid } : {}) },
      });
      toast.success(`Durum: ${PURCHASE_STATUS_LABEL[status]}`);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    }
  }

  async function onSendTransfer() {
    if (!opened) return;
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Geçerli bir tutar girin.");
      return;
    }
    setSending(true);
    try {
      await sendTransfer({ data: { id: opened.id, amount: value, currency } });
      toast.success("Havale bilgileri gönderildi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  async function saveNote() {
    if (!opened) return;
    try {
      await update({ data: { id: opened.id, admin_note: note } });
      toast.success("Not kaydedildi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Kaydedilemedi");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Durum</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as PurchaseInquiryStatus | "all")}
          >
            <SelectTrigger className="mt-1 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü ({rows.length})</SelectItem>
              {PURCHASE_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {PURCHASE_STATUS_LABEL[s]} ({counts[s] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dil</Label>
          <Select
            value={localeFilter}
            onValueChange={(v) => setLocaleFilter(v as "all" | "tr" | "en")}
          >
            <SelectTrigger className="mt-1 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="tr">TR</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {visible.length} kayıt — en yeni üstte. Bu kayıtlar sipariş değil, taleptir.
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Tarih</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead className="w-32">Tür</TableHead>
              <TableHead className="w-36">Durum</TableHead>
              <TableHead className="w-20 text-right">Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
              >
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {fmtDate(r.created_at)}
                </TableCell>
                <TableCell className="font-medium">
                  {r.full_name}
                  <LocaleBadge locale={r.locale} />
                </TableCell>
                <TableCell className="text-sm">{r.product_label ?? r.product_slug}</TableCell>
                <TableCell className="text-xs">{PURCHASE_KIND_LABEL[r.kind]}</TableCell>
                <TableCell className="text-xs">{PURCHASE_STATUS_LABEL[r.status]}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline">
                    {openId === r.id ? "Kapat" : "Aç"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Kayıt yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      {opened ? (
        <div className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl">
                {opened.full_name}
                <LocaleBadge locale={opened.locale} />
              </h3>
              <p className="text-sm text-muted-foreground">
                {opened.email}
                {opened.phone ? ` · ${opened.phone}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {PURCHASE_KIND_LABEL[opened.kind]} · {opened.product_label ?? opened.product_slug} ·{" "}
                {fmtDate(opened.created_at)}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
              Kapat
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Detail label="Ürün kodu" value={opened.product_slug} />
            <Detail label="Tercih edilen zaman" value={opened.preferred_slot} />
            <Detail label="Son güncelleme" value={fmtDate(opened.updated_at)} />
          </div>

          <div>
            <Label className="text-xs">Mesaj</Label>
            <p className="whitespace-pre-wrap text-sm">{opened.message || "—"}</p>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">Tutar</Label>
                <Input
                  className="mt-1 w-40"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Para birimi</Label>
                <Input
                  className="mt-1 w-24"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label className="text-xs">Ödeme referansı</Label>
                <p className="mt-2 text-sm font-medium">
                  {opened.payment_reference ?? paymentReferenceFor(opened.id)}
                </p>
              </div>
              <Button size="sm" onClick={onSendTransfer} disabled={sending}>
                {sending
                  ? "Gönderiliyor…"
                  : opened.transfer_sent_at
                    ? "Tekrar gönder"
                    : "Havale bilgilerini gönder"}
              </Button>
            </div>
            {opened.transfer_sent_at ? (
              <p className="text-xs text-amber-700 dark:text-amber-500">
                Havale bilgileri gönderildi —{" "}
                {opened.transfer_amount != null
                  ? `${Number(opened.transfer_amount).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ${opened.transfer_currency ?? ""}`
                  : "—"}{" "}
                — {fmtDate(opened.transfer_sent_at)}. Tekrar göndermek yeni bir e-posta oluşturur.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                IBAN yalnızca bu butona bastığınızda, talep sahibine e-posta ile iletilir.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Gönderilecek e-posta dili:{" "}
              <strong>
                {opened.locale === "en" ? "İngilizce (EN)" : "Türkçe (TR)"}
              </strong>{" "}
              — talebin geldiği sayfanın diline göre seçilir.
            </p>
          </div>

          <div>
            <Label className="text-xs">Durum akışı</Label>
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={notifyPaid}
                onChange={(e) => setNotifyPaid(e.target.checked)}
              />
              “Ödeme alındı” işaretlendiğinde talep sahibine kısa bir onay e-postası gönder
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PURCHASE_STATUS_ORDER.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={opened.status === s ? "default" : "outline"}
                  onClick={() => changeStatus(opened.id, s)}
                >
                  {PURCHASE_STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Yönetici notu</Label>
            <Textarea
              className="mt-1"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button size="sm" className="mt-2" onClick={saveNote}>
              Notu kaydet
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Input readOnly value={opened.email} className="w-72" />
            <Button size="sm" variant="outline" asChild>
              <a href={`mailto:${opened.email}`}>E-posta gönder</a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="#admin-test-order">Hak tanımla (sipariş aracı)</a>
            </Button>
            <span className="text-xs text-muted-foreground">
              Havale onaylandıktan sonra hak tanımlamayı Siparişler sekmesindeki araçla yapın.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <p className="text-sm">{value === null || value === "" ? "—" : String(value)}</p>
    </div>
  );
}