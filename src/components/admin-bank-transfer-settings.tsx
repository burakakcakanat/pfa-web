import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getBankTransferDetails,
  saveBankTransferDetailsFn,
} from "@/lib/purchase-inquiries.functions";
import type { BankTransferDetails } from "@/lib/purchase-inquiries";

const EMPTY: BankTransferDetails = {
  account_holder: "",
  bank_name: "",
  iban: "",
  currency: "TRY",
  note: "",
};

export function AdminBankTransferSettings() {
  const load = useServerFn(getBankTransferDetails);
  const save = useServerFn(saveBankTransferDetailsFn);
  const [form, setForm] = useState<BankTransferDetails>(EMPTY);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const d = await load();
      setForm({ ...EMPTY, ...(d as BankTransferDetails) });
    } catch (e: any) {
      toast.error(e?.message ?? "Havale bilgileri yüklenemedi");
    }
  }, [load]);
  useEffect(() => {
    reload();
  }, [reload]);

  const set = (k: keyof BankTransferDetails) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSave() {
    setBusy(true);
    try {
      await save({ data: { ...form, note: form.note ?? "" } });
      toast.success("Havale bilgileri kaydedildi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-6">
      <div>
        <h3 className="font-serif text-xl">Havale Bilgileri</h3>
        <p className="text-xs text-muted-foreground">
          Bu bilgiler hiçbir sayfada yayınlanmaz ve otomatik gönderilmez — yalnızca sizin
          tetiklediğiniz e-postalarla paylaşılır.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Alıcı adı" value={form.account_holder} onChange={set("account_holder")} />
        <Field label="Banka" value={form.bank_name} onChange={set("bank_name")} />
        <Field label="IBAN" value={form.iban} onChange={set("iban")} />
        <Field label="Para birimi" value={form.currency} onChange={set("currency")} />
      </div>
      <Field label="Not (opsiyonel)" value={form.note ?? ""} onChange={set("note")} />

      <Button size="sm" onClick={onSave} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}