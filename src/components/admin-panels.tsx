import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [pending, setPending] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStatus()
      .then((r) => setRows(r))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Durum okunamadı"));
  }, [loadStatus]);

  // "Hazır ✓" yalnızca hesap + roller + uygulayıcı hesap satırları tamsa.
  const ready = !!rows && rows.length > 0 && rows.every((r) => r.ready);

  const prepare = async () => {
    setBusy(true);
    try {
      const r = await ensure();
      setRows(r);
      toast.success("Test pasaportları hazır.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hazırlanamadı");
      // Kısmi durumu yine de ekrana yansıt.
      try {
        setRows(await loadStatus());
      } catch {
        /* durum okunamadıysa mevcut tabloyu koru */
      }
    } finally {
      setBusy(false);
    }
  };

  const generate = async (email: string) => {
    setPending(email);
    try {
      const { link } = await makeLink({ data: { email } });
      setLinks((prev) => ({ ...prev, [email]: link }));
      try {
        await navigator.clipboard.writeText(link);
        toast.success("Link panoya kopyalandı — gizli pencerede açın.");
      } catch {
        toast.success("Link üretildi — aşağıdan kopyalayın.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bağlantı üretilemedi");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <strong>Bu linki GİZLİ pencerede açın (Cmd/Ctrl+Shift+N).</strong> Normal pencerede
        açarsanız bu tarayıcıdaki oturumunuz test kullanıcısına geçer ve admin oturumunuz düşer.
      </div>

      <div className="flex items-center gap-3">
        {ready ? (
          <Badge variant="secondary">Hazır ✓</Badge>
        ) : (
          <Button onClick={prepare} disabled={busy || rows === null}>
            {busy ? "Hazırlanıyor…" : "Test pasaportlarını hazırla / onar"}
          </Button>
        )}
        {!ready && rows !== null && (
          <span className="text-xs text-muted-foreground">
            Eksik roller veya uygulayıcı hesap satırları bu düğmeyle tamamlanır.
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(rows ?? []).map((r) => (
          <Card key={r.email}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {r.label}
                {r.ready ? (
                  <Badge variant="secondary">hazır</Badge>
                ) : (
                  <Badge variant="outline">eksik</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="break-all font-mono text-xs text-muted-foreground">{r.email}</p>
              {!r.ready && (
                <p className="text-xs text-muted-foreground">
                  {r.exists ? "" : "Hesap yok · "}
                  {r.rolesOk ? "" : "roller eksik · "}
                  {r.accountOk ? "" : "uygulayıcı hesabı eksik"}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!r.exists || pending === r.email}
                onClick={() => generate(r.email)}
              >
                {pending === r.email ? "Bağlantı üretiliyor…" : "Giriş linki üret ve kopyala"}
              </Button>
              {links[r.email] && (
                <div className="space-y-2">
                  <Input readOnly value={links[r.email]} className="font-mono text-[11px]" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(links[r.email]);
                      toast.success("Kopyalandı");
                    }}
                  >
                    Tekrar kopyala
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Link tek kullanımlıktır; kullandıysanız tekrar üretin.
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
