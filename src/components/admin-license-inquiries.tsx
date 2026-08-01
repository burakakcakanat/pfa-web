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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listAdminLicenseInquiries,
  updateAdminLicenseInquiry,
} from "@/lib/license-inquiries.functions";
import {
  LICENSE_STATUS_LABEL,
  LICENSE_TYPE_LABEL,
  type AdminLicenseInquiryRow,
  type LicenseStatus,
  type LicenseType,
} from "@/lib/license-inquiries";

const STATUSES = Object.keys(LICENSE_STATUS_LABEL) as LicenseStatus[];

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export function AdminLicenseInquiries() {
  const list = useServerFn(listAdminLicenseInquiries);
  const update = useServerFn(updateAdminLicenseInquiry);
  const [rows, setRows] = useState<AdminLicenseInquiryRow[]>([]);
  const [type, setType] = useState<LicenseType>("ulke");
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    try {
      const r = await list();
      setRows((r ?? []) as AdminLicenseInquiryRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Başvurular yüklenemedi");
    }
  }, [list]);
  useEffect(() => {
    reload();
  }, [reload]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) => r.type === type && (statusFilter === "all" || r.status === statusFilter),
      ),
    [rows, type, statusFilter],
  );

  const opened = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => {
    setNote(opened?.admin_note ?? "");
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeStatus(id: string, status: LicenseStatus) {
    try {
      await update({ data: { id, status } });
      toast.success("Durum güncellendi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
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

  const counts = useMemo(() => {
    const c: Record<LicenseType, number> = { ulke: 0, kurumsal: 0 };
    for (const r of rows) c[r.type] += 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {(["ulke", "kurumsal"] as LicenseType[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={type === t ? "default" : "outline"}
              onClick={() => {
                setType(t);
                setOpenId(null);
              }}
            >
              {LICENSE_TYPE_LABEL[t]} ({counts[t]})
            </Button>
          ))}
        </div>
        <div>
          <Label className="text-xs">Durum</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as LicenseStatus | "all")}
          >
            <SelectTrigger className="mt-1 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LICENSE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{visible.length} kayıt — en yeni üstte.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>{type === "ulke" ? "Hedef bölge" : "Kurum tipi"}</TableHead>
              <TableHead>Kurum</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell>
                  {(type === "ulke" ? r.target_territory : r.institution_type) ?? "—"}
                </TableCell>
                <TableCell>{r.organisation ?? "—"}</TableCell>
                <TableCell>{fmtDate(r.created_at)}</TableCell>
                <TableCell>{LICENSE_STATUS_LABEL[r.status]}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                    Aç
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
              <h3 className="font-serif text-2xl">{opened.full_name}</h3>
              <p className="text-sm text-muted-foreground">
                {opened.email}
                {opened.phone ? ` · ${opened.phone}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {LICENSE_TYPE_LABEL[opened.type]} · {fmtDate(opened.created_at)}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
              Kapat
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Detail label="Kurum / Şirket" value={opened.organisation} />
            <Detail label="Görev" value={opened.role} />
            <Detail label="Ülke" value={opened.country} />
            <Detail label="Şehir" value={opened.city} />
            <Detail label="Web sitesi" value={opened.website} />
            <Detail label="Beklenen zaman planı" value={opened.expected_timeline} />
          </div>

          {opened.type === "ulke" ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Detail label="Hedef bölge" value={opened.target_territory} />
                <Detail label="Mevcut faaliyet alanı" value={opened.existing_business_area} />
                <Detail label="Ekip büyüklüğü" value={opened.team_size} />
                <Detail label="Alandaki deneyim (yıl)" value={opened.years_in_field} />
              </div>
              <Long label="Neden PFA" value={opened.why_pfa} />
              <Long label="Pazara giriş yaklaşımı" value={opened.gtm_approach} />
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Detail label="Kurum tipi" value={opened.institution_type} />
                <Detail label="Yıllık katılımcı" value={opened.annual_trainee_volume} />
                <Detail label="Eğitmen sayısı" value={opened.trainer_count} />
              </div>
              <Long label="Mevcut programlar" value={opened.current_programmes} />
              <Long label="PFA'yı kullanım amacı" value={opened.intended_use} />
            </>
          )}

          <Long label="Mesaj" value={opened.message} />

          <div>
            <Label>Durum</Label>
            <Select
              value={opened.status}
              onValueChange={(v) => changeStatus(opened.id, v as LicenseStatus)}
            >
              <SelectTrigger className="mt-1 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LICENSE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="border-t border-border pt-4">
            <Label className="text-xs">Yanıtla</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input readOnly value={opened.email} className="w-72" />
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${opened.email}`}>E-posta gönder</a>
              </Button>
            </div>
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

function Long({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value || "—"}</p>
    </div>
  );
}
