// Uygulayıcı Paneli — PFAP ve Fellow varyantları.
// Bölüm kartları deseni: mevcut /hesabim sekme yapısı korunur; panel "Uygulayıcı"
// sekmesinin içinde kartlar halinde açılır. Danışanlarım ve Uygulayıcı Webinarları
// kendi sekmelerinde kalır, panelden bağlantı verilir.
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getPractitionerPanel,
  savePractitionerBilling,
  requestFellowUpgrade,
  type PractitionerPanel,
} from "@/lib/practitioner-panel.functions";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtMoney(cents: number, currency: string) {
  const cur = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(cur === "TRY" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}

function moneyMap(map: Record<string, number>) {
  const entries = Object.entries(map);
  if (entries.length === 0) return "—";
  return entries.map(([cur, cents]) => fmtMoney(cents, cur)).join(" · ");
}

/** Sonraki tazeleme penceresi: Mart / Ekim'den yakın olanı. */
function nextRefreshWindow(now = new Date()) {
  const y = now.getUTCFullYear();
  const candidates = [
    new Date(Date.UTC(y, 2, 1)),
    new Date(Date.UTC(y, 9, 1)),
    new Date(Date.UTC(y + 1, 2, 1)),
  ];
  const next = candidates.find((d) => d.getTime() >= now.getTime()) ?? candidates[2];
  return next.getUTCMonth() === 2 ? `Mart ${next.getUTCFullYear()}` : `Ekim ${next.getUTCFullYear()}`;
}

function addYears(iso: string, years: number) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

export { InfoHint };


function Section({
  title,
  hint,
  children,
  highlight,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={`rounded-lg border p-6 ${highlight ? "border-accent bg-accent/5" : "border-border bg-card"}`}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-serif text-xl">{title}</h3>
        {hint ? <InfoHint text={hint} /> : null}
      </div>
      <div className="mt-4 text-sm">{children}</div>
    </section>
  );
}

const CERT_LABEL: Record<string, string> = {
  pending: "Hazırlanıyor",
  issued: "Düzenlendi",
  revoked: "İptal",
};

export function PractitionerPanelView({ onGoToClients }: { onGoToClients?: () => void }) {
  const fetchPanel = useServerFn(getPractitionerPanel);
  const [data, setData] = useState<PractitionerPanel | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData((await fetchPanel()) as PractitionerPanel);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Panel yüklenemedi.");
    }
  }, [fetchPanel]);
  useEffect(() => { load(); }, [load]);

  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  const isFellow = data.tier === "fellow";
  const badge = isFellow ? "PFA Fellow" : "PFA Practitioner";
  const validUntil = data.licenseValidUntil
    ? fmtDate(data.licenseValidUntil)
    : isFellow
      ? "Aboneliğiniz süresince geçerli"
      : data.licenseGrantedAt
        ? fmtDate(addYears(data.licenseGrantedAt, 5))
        : "—";

  return (
    <div className="space-y-6">
      {/* 1 — Lisans kartı */}
      <Section
        title="Lisansım"
        hint="PFA Practitioner lisansı 5 yıl geçerlidir; beş yılın sonunda bir günlük tazeleme çalışmasına katılırsınız (Mart/Ekim)."
        highlight
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Rozet" value={badge} />
          <Row label="Veriliş" value={fmtDate(data.licenseGrantedAt)} />
          <Row label="Geçerlilik" value={validUntil} />
          <Row
            label="Sertifika"
            value={data.certificateStatus ? (CERT_LABEL[data.certificateStatus] ?? data.certificateStatus) : "Hazırlanıyor"}
          />
          <Row label="Sıradaki tazeleme penceresi" value={nextRefreshWindow()} />
        </div>
      </Section>

      {/* 2 — Kota */}
      <Section
        title="Danışan Ölçeği Kotası"
        hint="Lisansınızla verilen ücretsiz davet hakkı. Bittiğinde davetleriniz otomatik olarak 'danışan öder' moduna geçer — danışanınız %5 referans indirimiyle öder, size komisyon işler."
      >
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-2xl">
            {data.quota.remaining} / {data.quota.total}
          </span>
          <span className="text-xs text-muted-foreground">{data.quota.used} kullanıldı</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${data.quota.total > 0 ? Math.min(100, (data.quota.remaining / data.quota.total) * 100) : 0}%`,
            }}
          />
        </div>
        {data.quota.total === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Henüz tanımlı bir kotanız yok.</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          {onGoToClients ? (
            <button
              type="button"
              onClick={onGoToClients}
              className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
            >
              Danışanlarım →
            </button>
          ) : null}
          <Link to="/uygulayicilar" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm">
            Uygulayıcı Rehberi
          </Link>
        </div>
      </Section>

      {/* 3 — Referans kodum */}
      <ReferralSection code={data.referralCode} />

      {/* 4 — Cari Hesap */}
      <Section title="Cari Hesap">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Bekleyen Komisyon Alacağı" value={moneyMap(data.pendingByCurrency)} />
          <Row label="Toplam tahakkuk" value={moneyMap(data.earnedTotalByCurrency)} />
        </div>

        <div className="mt-4 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
          Ekstre her ayın 8'inde kesilir · Fatura için son gün 15'i · Havale 22'sinde.
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-[0.2em] text-accent">Son hareketler</div>
          {data.ledger.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Henüz komisyon hareketiniz yok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {data.ledger.slice(0, 12).map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{fmtDate(l.created_at)}</span>
                  <span className="min-w-0 flex-1 truncate px-2">{l.product_slug ?? "—"}</span>
                  <span className="text-muted-foreground">
                    brüt {fmtMoney(l.gross_amount_cents, l.currency)} · %{l.commission_rate_pct}
                  </span>
                  <span className="font-medium">{fmtMoney(l.commission_amount_cents, l.currency)}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-[0.2em] text-accent">Ekstre geçmişi</div>
          {data.statements.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Henüz ekstreniz yok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {data.statements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span>
                    {fmtDate(s.period_start)} – {fmtDate(s.period_end)}
                  </span>
                  <span className="font-medium">{fmtMoney(s.total_amount_cents, s.currency)}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* 5 — Performansım */}
      <Section title="Performansım">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Gönderilen davet" value={String(data.performance.invitesSent)} />
          <Row label="Tamamlanan" value={String(data.performance.invitesCompleted)} />
          <Row
            label="Dönüşüm oranı"
            value={
              data.performance.invitesSent > 0
                ? `${Math.round((data.performance.invitesCompleted / data.performance.invitesSent) * 100)}%`
                : "—"
            }
          />
          <Row label="Kazanılan komisyon (kümülatif)" value={moneyMap(data.earnedTotalByCurrency)} />
          <Row label="Bu dönem" value={moneyMap(data.earnedPeriodByCurrency)} />
        </div>
        {data.performance.invitesSent === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Henüz davet göndermediniz. Danışanlarım sekmesinden ilk davetinizi oluşturabilirsiniz.
          </p>
        ) : null}
      </Section>

      {/* PFAP-only: 7 & 8 */}
      {!isFellow ? (
        <>
          <FellowUpgradeCard open={data.fellowRequestOpen} onChanged={load} />
          <Section title="Rozet farkı">
            {Object.keys(data.earnedPeriodByCurrency).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu dönem henüz komisyon hareketiniz yok; hareket oluştuğunda Fellow rozetindeki
                karşılığı burada görünür.
              </p>
            ) : (
              <ul className="space-y-1">
                {Object.entries(data.earnedPeriodByCurrency).map(([cur, cents]) => (
                  <li key={cur}>
                    Bu dönem kazandığınız komisyon: <strong>{fmtMoney(cents, cur)}</strong> — Fellow
                    rozetinde aynı satışlar <strong>{fmtMoney(cents * 2, cur)}</strong> ederdi.
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : (
        <>
          {/* Fellow-only: 9 */}
          <Section
            title="Aboneliğim"
            hint="Abonelikten ayrılırsanız lisansınız 5 yıl daha geçerli kalır ve PFA Practitioner rozetine dönersiniz."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Row
                label="Durum"
                value={
                  data.subscriptionStatus === "active" || data.subscriptionStatus === "aktif"
                    ? "Aktif"
                    : data.subscriptionStatus
                      ? "İptal"
                      : "—"
                }
              />
              <Row label="Yenileme" value={data.subscriptionRenewsAt ? fmtDate(data.subscriptionRenewsAt) : "—"} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Abonelik işlemleri şimdilik PFA tarafından yürütülür.
            </p>
          </Section>

          {/* Fellow-only: 10 */}
          <Section title="Gelişim webinarları">
            <div className="rounded-md border border-accent/50 bg-accent/5 p-4">
              <div className="text-sm font-medium text-accent">Programa dahil — ücretsiz katılın</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Gelişim programına dahil uygulayıcı webinarlarına Fellow rozetinizle ücretsiz kayıt
                olabilirsiniz.
              </p>
            </div>
          </Section>
        </>
      )}

      {/* 6 — Fatura bilgilerim */}
      <BillingSection billing={data.billing} onSaved={load} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function ReferralSection({ code }: { code: string | null }) {
  const [copied, setCopied] = useState<null | "code" | "link">(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = code ? `${origin}/degerlendirme?ref=${code}` : "";

  async function copy(what: "code" | "link", value: string) {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* sessizce yut */
    }
  }

  return (
    <Section
      title="Referans kodum"
      hint="Bu kodla veya linkle gelen her PFA BSÖ satışında danışanınız %5 indirim alır, size komisyon tahakkuk eder."
    >
      {!code ? (
        <p className="text-sm text-muted-foreground">
          Referans kodunuz lisansınız tanımlandığında oluşturulur.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">{code}</span>
            <button type="button" onClick={() => copy("code", code)} className="rounded-md border border-border px-3 py-2 text-xs">
              {copied === "code" ? "Kopyalandı" : "Kodu kopyala"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={link} className="min-w-0 flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs" />
            <button type="button" onClick={() => copy("link", link)} className="rounded-md border border-border px-3 py-2 text-xs">
              {copied === "link" ? "Kopyalandı" : "Linki kopyala"}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function FellowUpgradeCard({ open, onChanged }: { open: boolean; onChanged: () => void }) {
  const request = useServerFn(requestFellowUpgrade);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(open);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setSent(open), [open]);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await request();
      setSent(true);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Talep oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  const rows: Array<[string, string, string]> = [
    ["Komisyon", "%25", "%50"],
    ["Danışan ölçeği kotası", "3", "7"],
    ["Yenileme", "$240", "$120"],
    ["Gelişim webinarları", "Ücretli", "Dahil"],
    ["Rehber sıralaması", "Standart", "Öncelikli"],
  ];

  return (
    <Section title="Fellow'a yükselt" highlight>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-3 bg-muted/50 px-3 py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          <span></span>
          <span>PFAP</span>
          <span>Fellow</span>
        </div>
        {rows.map(([label, a, b]) => (
          <div key={label} className="grid grid-cols-3 border-t border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span>{a}</span>
            <span className="font-medium text-accent">{b}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        {sent ? (
          <span className="inline-flex items-center rounded-md border border-accent/60 bg-accent/10 px-4 py-2 text-sm text-accent">
            Talebiniz alındı
          </span>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Gönderiliyor…" : "Fellow olmak istiyorum"}
          </button>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Talebiniz onaylandığında sizinle iletişime geçilir.
        </p>
        {err ? <p className="mt-2 text-sm text-destructive">{err}</p> : null}
      </div>
    </Section>
  );
}

function BillingSection({
  billing,
  onSaved,
}: {
  billing: PractitionerPanel["billing"];
  onSaved: () => void;
}) {
  const save = useServerFn(savePractitionerBilling);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await save({
        data: {
          iban: String(fd.get("iban") ?? ""),
          fatura_unvani: String(fd.get("fatura_unvani") ?? ""),
          vergi_no: String(fd.get("vergi_no") ?? ""),
          vergi_dairesi: String(fd.get("vergi_dairesi") ?? ""),
          adres: String(fd.get("adres") ?? ""),
        },
      });
      setMsg("Kaydedildi.");
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Fatura bilgilerim"
      hint="Ekstre karşılığı fatura kesebilmeniz için gereklidir; havale bu bilgilere yapılır."
    >
      {!billing ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Henüz fatura bilginiz yok. Aşağıdaki formu doldurarak ekleyebilirsiniz.
        </p>
      ) : null}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <BillingField label="Fatura ünvanı" name="fatura_unvani" defaultValue={billing?.fatura_unvani ?? ""} />
        <BillingField label="IBAN" name="iban" defaultValue={billing?.iban ?? ""} />
        <BillingField label="Vergi / TC no" name="vergi_no" defaultValue={billing?.vergi_no ?? ""} />
        <BillingField label="Vergi dairesi" name="vergi_dairesi" defaultValue={billing?.vergi_dairesi ?? ""} />
        <label className="sm:col-span-2 flex flex-col">
          <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">Adres</span>
          <textarea
            name="adres"
            rows={3}
            defaultValue={billing?.adres ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {msg ? <span className="text-xs text-accent">{msg}</span> : null}
          {err ? <span className="text-xs text-destructive">{err}</span> : null}
        </div>
      </form>
    </Section>
  );
}

function BillingField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col">
      <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
