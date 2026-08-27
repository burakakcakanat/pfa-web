import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  createPassportLoginLink,
  ensureTestPassports,
  getTestPassportStatus,
  type PassportStatus,
} from "@/lib/test-passports.functions";

export function AdminPanels() {
  const loadStatus = useServerFn(getTestPassportStatus);
  const ensure = useServerFn(ensureTestPassports);
  const makeLink = useServerFn(createPassportLoginLink);

  const [rows, setRows] = useState<PassportStatus[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    loadStatus()
      .then((r) => setRows(r))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Durum okunamadı"));
  }, [loadStatus]);

  const ready = !!rows && rows.length > 0 && rows.every((r) => r.exists);

  const prepare = async () => {
    setBusy(true);
    try {
      const r = await ensure();
      setRows(r);
      toast.success("Test pasaportları hazır.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hazırlanamadı");
    } finally {
      setBusy(false);
    }
  };

  const open = async (email: string) => {
    setOpening(email);
    try {
      const { link } = await makeLink({ data: { email } });
      window.open(link, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bağlantı üretilemedi");
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Kullanıcı panellerini test pasaportlarıyla, oturumunuzdan çıkmadan yeni sekmede
          gezin.
        </p>
        <div className="flex items-center gap-3">
          {ready ? (
            <Badge variant="secondary">Hazır ✓</Badge>
          ) : (
            <Button onClick={prepare} disabled={busy || rows === null}>
              {busy ? "Hazırlanıyor…" : "Test pasaportlarını hazırla"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(rows ?? []).map((r) => (
          <Card key={r.email}>
            <CardHeader>
              <CardTitle className="text-base">{r.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="break-all font-mono text-xs text-muted-foreground">{r.email}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={!r.exists || opening === r.email}
                onClick={() => open(r.email)}
              >
                {opening === r.email ? "Bağlantı üretiliyor…" : "Yeni sekmede aç"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Link tek kullanımlıktır; sekme kapandıysa tekrar üretin.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        Test hesaplarında yapılan işlemler gerçek veritabanına yazılır — sipariş/ödeme
        testleri için is_test işaretini kullanın.
      </p>
    </div>
  );
}

export default AdminPanels;
