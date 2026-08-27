import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  adminListSessionRequests,
  adminUpdateSessionRequest,
} from "@/lib/session-requests.functions";
import {
  SESSION_STATUS_LABEL_TR,
  SESSION_STATUS_ORDER,
  type AdminSessionRequestRow,
  type SessionRequestStatus,
} from "@/lib/session-requests";

const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** Admin: confirm session requests. Confirmation is always manual. */
export function AdminSessionRequests() {
  const list = useServerFn(adminListSessionRequests);
  const update = useServerFn(adminUpdateSessionRequest);
  const [rows, setRows] = useState<AdminSessionRequestRow[]>([]);
  const [edit, setEdit] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    try {
      setRows(await list());
    } catch (e: any) {
      toast.error(e?.message ?? "Seans talepleri yüklenemedi");
    }
  }, [list]);
  useEffect(() => {
    reload();
  }, [reload]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);

  async function change(row: AdminSessionRequestRow, status: SessionRequestStatus) {
    try {
      const confirmed = (edit[row.id] ?? "").trim();
      const res = await update({
        data: {
          id: row.id,
          status,
          ...(status === "confirmed" && confirmed ? { confirmed_slot: confirmed } : {}),
        },
      });
      toast.success(
        status === "confirmed"
          ? res.emailed
            ? "Onaylandı ve teyit e-postası gönderildi."
            : "Onaylandı (e-posta gönderilemedi)."
          : `Durum: ${SESSION_STATUS_LABEL_TR[status]}`,
      );
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-serif text-xl">Seans Talepleri</h3>
        <p className="text-sm text-muted-foreground">
          Seans hakkı kullanılarak istenen zamanlar. Onay verilmedikçe randevu kesinleşmez —{" "}
          {pending} talep teyit bekliyor.
        </p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Talep</TableHead>
              <TableHead>Kişi</TableHead>
              <TableHead>Tercih edilen zaman</TableHead>
              <TableHead className="w-36">Durum</TableHead>
              <TableHead className="w-[22rem]">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {fmt(r.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="font-medium">{r.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {r.preferred_slot || "—"}
                  {r.confirmed_at ? (
                    <div className="text-xs text-emerald-700">Onay: {fmt(r.confirmed_at)}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">{SESSION_STATUS_LABEL_TR[r.status]}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-end gap-2">
                    {r.status === "pending" ? (
                      <div>
                        <Label className="text-[10px]">Kesin zaman (opsiyonel)</Label>
                        <Input
                          className="mt-1 h-8 w-44 text-xs"
                          placeholder={r.preferred_slot}
                          value={edit[r.id] ?? ""}
                          onChange={(e) => setEdit((s) => ({ ...s, [r.id]: e.target.value }))}
                        />
                      </div>
                    ) : null}
                    {SESSION_STATUS_ORDER.filter((s) => s !== r.status).map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => change(r, s)}>
                        {SESSION_STATUS_LABEL_TR[s]}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Seans talebi yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
