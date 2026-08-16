import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BuyButton } from "@/components/buy-button";
import { getProDashboard, createProInvite } from "@/lib/pro.functions";
import { listMyEbooks, getEbookUrl } from "@/lib/ebooks.functions";
import { listMyGifts } from "@/lib/gifts.functions";
import { PractitionerAccountTab } from "@/components/practitioner-account";
import { ResearchPreferences } from "@/components/research-preferences";
import { NewsletterTabAction } from "@/components/newsletter-row";
import { MySessionsTab } from "@/components/my-sessions";

export const Route = createFileRoute("/_authenticated/hesabim")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s.tab === "string" ? { tab: s.tab } : {},
  head: () => ({
    meta: [
      { title: "Hesabım — PFA" },
      { name: "description", content: "PFA hesap paneli: profil, satın alımlar, raporlar, e-book'lar ve webinar kayıtları." },
    ],
  }),
  component: AccountPage,
});

type Profile = { id: string; full_name: string | null; email: string | null; preferred_language: string };
type Order = { id: string; status: string; amount_cents: number; currency: string; created_at: string; products: { name_tr: string; slug: string } | null };
type Entitlement = { id: string; type: string; created_at: string; metadata: Record<string, unknown> };
type MyGift = {
  id: string;
  product_slug: string;
  recipient_name: string;
  recipient_email: string;
  status: "pending" | "claimed";
  claim_token: string;
  created_at: string;
  claimed_at: string | null;
};
type AssessmentSessionRow = { id: string; type: "mini" | "full"; status: string; created_at: string; completed_at: string | null };
type SevenqSessionRow = { id: string; status: string; created_at: string; completed_at: string | null };
type ReportRow = { id: string; kind: "scale" | "sevenq"; label: string; date: string };
type ProInvite = {
  id: string;
  client_name: string;
  token: string;
  status: string;
  created_at: string;
  session_id?: string | null;
  sevenq_session_id?: string | null;
};

const TABS = [
  { id: "profile", label: "Profil" },
  { id: "orders", label: "Satın Alımlarım" },
  { id: "sessions", label: "Seanslarım" },
  { id: "reports", label: "Raporlarım" },
  { id: "ebooks", label: "E-Kitaplarım" },
  { id: "webinars", label: "Webinar Kayıtlarım" },
  { id: "research", label: "Araştırma" },
] as const;

function AccountPage() {
  const search = Route.useSearch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSessionRow[]>([]);
  const [sevenqSessions, setSevenqSessions] = useState<SevenqSessionRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [tab, setTab] = useState<string>(search.tab ?? "profile");
  const [fullName, setFullName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("tr");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [gifts, setGifts] = useState<MyGift[]>([]);
  const fetchGifts = useServerFn(listMyGifts);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const [{ data: p }, { data: o }, { data: e }, { data: r }, { data: a }, { data: sq }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("orders").select("id,status,amount_cents,currency,created_at,products(name_tr,slug)").order("created_at", { ascending: false }),
        supabase.from("user_entitlements").select("id,type,created_at,metadata").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role"),
        supabase.from("assessment_sessions").select("id, type, status, created_at, completed_at").eq("status", "completed").order("completed_at", { ascending: false }),
        supabase.from("sevenq_sessions").select("id, status, created_at, completed_at").eq("user_id", uid).eq("status", "completed").order("completed_at", { ascending: false }),
      ]);
      if (p) { setProfile(p as Profile); setFullName((p as Profile).full_name ?? ""); setPreferredLanguage((p as Profile).preferred_language ?? "tr"); }
      setOrders((o ?? []) as unknown as Order[]);
      setEntitlements((e ?? []) as unknown as Entitlement[]);
      setRoles(((r ?? []) as { role: string }[]).map((x) => x.role));
      setAssessments((a ?? []) as unknown as AssessmentSessionRow[]);
      setSevenqSessions((sq ?? []) as unknown as SevenqSessionRow[]);
    })();
  }, []);

  useEffect(() => {
    fetchGifts().then((g) => setGifts((g ?? []) as unknown as MyGift[])).catch(() => setGifts([]));
  }, [fetchGifts]);

  // Panel erişimi tek kaynağa bağlı: pfa_pro entitlement (admin istisnası korunur).
  const isPro =
    entitlements.some((x) => x.type === "pfa_pro") || roles.includes("admin");
  const tabs = [
    ...TABS,
    { id: "practitioner", label: "Uygulayıcı" },
    ...(isPro ? [{ id: "clients", label: "Danışanlarım" }] : []),
  ];

  async function saveProfile() {
    if (!profile) return;
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, preferred_language: preferredLanguage }).eq("id", profile.id);
    setSaving(false); setMsg(error ? `Hata: ${error.message}` : "Kaydedildi.");
  }

  const ebooks = entitlements.filter((x) => x.type === "ebook");
  const webinars = entitlements.filter((x) => x.type === "webinar_bsc" || x.type === "pfa_pro");

  const reports: ReportRow[] = [
    ...assessments.map((a) => ({
      id: a.id,
      kind: "scale" as const,
      label: a.type === "full" ? "Tam Ölçek Raporu" : "Mini Değerlendirme",
      date: a.completed_at ?? a.created_at,
    })),
    ...sevenqSessions.map((s) => ({
      id: s.id,
      kind: "sevenq" as const,
      label: "Kapasite Profili",
      date: s.completed_at ?? s.created_at,
    })),
  ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  return (
    <div className="container-page py-16">
      <header className="max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Hesabım</div>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Hoş geldiniz</h1>
        <p className="mt-4 text-sm text-muted-foreground">Profilinizi, satın alımlarınızı ve yetkilerinizi buradan yönetin.</p>
      </header>

      <div className="mt-10 flex flex-wrap gap-2 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${tab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
        <NewsletterTabAction />
      </div>

      <div className="mt-8 max-w-3xl">
        {tab === "profile" && (
          <div className="space-y-6">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <label className="block text-sm"><span className="mb-1 block text-foreground/80">E-posta</span>
              <input readOnly value={profile?.email ?? ""} className="w-full rounded-md border border-border bg-muted/40 px-3 py-2" /></label>
            <label className="block text-sm"><span className="mb-1 block text-foreground/80">Ad Soyad</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
            <label className="block text-sm"><span className="mb-1 block text-foreground/80">Dil Tercihi</span>
              <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                <option value="tr">Türkçe</option><option value="en">English</option></select></label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={saveProfile} disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "..." : "Kaydet"}</button>
              {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
            </div>
          </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card">
            {orders.length === 0 ? <EmptyState text="Henüz bir satın alımınız yok." /> : (
              <ul className="divide-y divide-border">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-medium">{o.products?.name_tr ?? "Ürün"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("tr-TR")}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-serif text-lg">${(o.amount_cents / 100).toFixed(2)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            {gifts.length > 0 && <GiftsList gifts={gifts} />}
          </div>
        )}

        {tab === "reports" && (
          <div className="rounded-lg border border-border bg-card">
            {reports.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Henüz bir raporunuz yok. <Link to="/degerlendirme" className="text-accent">PFA Ölçeği →</Link>{" "}
                <Link to="/7q" className="text-accent">7Q Profili →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {reports.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="flex items-center justify-between gap-4 p-4 text-sm">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${a.kind === "sevenq" ? "bg-accent/15 text-accent" : "bg-muted text-foreground"}`}>
                          {a.kind === "sevenq" ? "7Q Profili" : "PFA Ölçeği"}
                        </span>
                        <span className="font-medium">{a.label}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(a.date).toLocaleString("tr-TR")}</div>
                    </div>
                    {a.kind === "sevenq" ? (
                      <Link to="/7q/rapor/$sessionId" params={{ sessionId: a.id }} className="shrink-0 text-accent hover:underline">Görüntüle →</Link>
                    ) : (
                      <Link to="/rapor/$sessionId" params={{ sessionId: a.id }} className="shrink-0 text-accent hover:underline">Görüntüle →</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "ebooks" && <EbookTab hasAny={ebooks.length > 0} />}

        {tab === "webinars" && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {webinars.length === 0
              ? <>Webinar kayıtlarınız burada görünecek. <Link to="/webinarlar" className="text-accent">Webinarları gör →</Link></>
              : <ul className="space-y-2">{webinars.map((w) => <li key={w.id}>{w.type === "pfa_pro" ? "PFA-Pro Lisans Paketi" : "Bilinç Seviyeleri Çalışmaları"} — {new Date(w.created_at).toLocaleDateString("tr-TR")}</li>)}</ul>}
          </div>
        )}

        {tab === "clients" && <ClientsTab />}
        {tab === "sessions" && <MySessionsTab />}
        {tab === "research" && <ResearchPreferences />}
        {tab === "practitioner" && (
          <PractitionerAccountTab onGoToClients={() => setTab("clients")} />
        )}
      </div>
    </div>
  );
}

function EbookTab({ hasAny }: { hasAny: boolean }) {
  const fetchList = useServerFn(listMyEbooks);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listMyEbooks>> | null>(null);

  useEffect(() => {
    if (!hasAny) { setItems([]); return; }
    fetchList().then(setItems).catch(() => setItems([]));
  }, [hasAny, fetchList]);

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        E-kitaplarınız burada görünecek. <Link to="/kitaplar" className="text-accent">Kitaplara göz at →</Link>
      </div>
    );
  }

  if (!items) return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Yükleniyor…</div>;

  return (
    <ul className="space-y-4">
      {items.map((it) => (
        <EbookRow key={it.slug} slug={it.slug} label={it.label} available={it.available} />
      ))}
    </ul>
  );
}

function EbookRow({ slug, label, available }: { slug: string; label: string; available: boolean }) {
  const getUrl = useServerFn(getEbookUrl);
  const [busy, setBusy] = useState<null | "view" | "pdf" | "epub">(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function open(action: "view" | "pdf" | "epub") {
    setErr(null); setBusy(action);
    try {
      const args =
        action === "view"
          ? { slug, mode: "view" as const }
          : action === "pdf"
            ? { slug, mode: "download" as const, format: "pdf" as const }
            : { slug, mode: "download" as const, format: "epub" as const };
      const res = await getUrl({ data: args });
      if (res?.url) {
        if (res.personalized && action === "view") {
          setMsg("İmzalı nüshanız hazırlandı.");
        }
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setErr(
          res?.errorCode
            ? `Dosya bulunamadı. [${res.errorCode}]`
            : action === "epub"
            ? "EPUB dosyası henüz yüklenmedi."
            : "Nüshanız hazırlanıyor. Yazar imzası ve dosya yüklendiğinde açılacak.",
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setErr(
        message.includes("[EBOOK_")
          ? message
          : message.toLowerCase().includes("unauthorized") || message.includes("401")
            ? "Oturum doğrulanamadı. Lütfen yeniden giriş yapın. [EBOOK_AUTH]"
            : "E-kitap işlemi tamamlanamadı. [EBOOK_RPC]",
      );
    } finally { setBusy(null); }
  }

  return (
    <li className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-serif text-xl">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            İsme imzalı PDF + standart EPUB · kişisel kullanım için lisanslı.
          </div>
          {!available && (
            <div className="mt-3 text-sm text-muted-foreground">
              Nüshanız hazırlanıyor. Yazar imzası veya kaynak dosya yüklendiğinde bu alandan okuyabilir veya indirebilirsiniz.
            </div>
          )}
          {msg && <div className="mt-3 text-xs text-accent">{msg}</div>}
          {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => open("view")}
            disabled={!available || busy !== null}
            className="btn-outline disabled:opacity-50"
          >
            {busy === "view" ? "..." : "Oku"}
          </button>
          <button
            type="button"
            onClick={() => open("pdf")}
            disabled={!available || busy !== null}
            className="btn-primary disabled:opacity-50"
          >
            {busy === "pdf" ? "..." : "PDF İndir"}
          </button>
          <button
            type="button"
            onClick={() => open("epub")}
            disabled={!available || busy !== null}
            className="btn-primary disabled:opacity-50"
          >
            {busy === "epub" ? "..." : "EPUB İndir"}
          </button>
        </div>
      </div>
    </li>
  );
}

function GiftsList({ gifts }: { gifts: MyGift[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4 font-serif text-lg">Hediye Ettikleriniz</div>
      <ul className="divide-y divide-border">
        {gifts.map((g) => {
          const link = typeof window !== "undefined" ? `${window.location.origin}/hediye/${g.claim_token}` : "";
          return (
            <li key={g.id} className="p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{g.recipient_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.recipient_email} · {new Date(g.created_at).toLocaleDateString("tr-TR")}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${g.status === "claimed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {g.status === "claimed" ? "Alındı" : "Bekliyor"}
                </span>
              </div>
              {g.status === "pending" && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Aşağıdaki bağlantıyı alıcıya iletin — otomatik e-posta gönderimi henüz aktif değil.
                  </div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={link} className="flex-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs" />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(link)}
                      className="btn-outline text-xs"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ClientsTab() {
  const fetchDash = useServerFn(getProDashboard);
  const createInvite = useServerFn(createProInvite);
  const [data, setData] = useState<Awaited<ReturnType<typeof getProDashboard>> | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(await fetchDash({ data: undefined as unknown as never }));
  }, [fetchDash]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await createInvite({ data: { client_name: name } });
      setName("");
      await load();
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "Hata";
      setErr(msg.includes("QUOTA_EXHAUSTED") ? "Kalan hakkınız kalmadı. Ek paket satın alarak devam edebilirsiniz." : msg);
    } finally { setBusy(false); }
  }

  if (!data) return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Yükleniyor…</div>;
  if (!data.hasPro) return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">PFA-Pro lisansı gerekli.</div>;

  const exhausted = data.remaining <= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-accent">Danışan Ölçek Hakkı</div>
          <div className="mt-1 font-serif text-3xl">{data.remaining} <span className="text-base text-muted-foreground">/ {data.quota} kalan</span></div>
          <div className="text-xs text-muted-foreground">{data.used} kullanıldı</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-muted-foreground">Ek paket: 10 hak · $50</div>
          <BuyButton productSlug="client-pack-10" label="Ek Paket Satın Al (+10)" />
        </div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-border bg-card p-6">
        <div className="font-serif text-xl">Yeni danışan davet et</div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Danışan adı" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" disabled={busy || exhausted || !name.trim()} className="btn-primary disabled:opacity-50">
            {busy ? "..." : "Davet Oluştur"}
          </button>
        </div>
        {exhausted && <div className="mt-3 text-sm text-muted-foreground">Kalan hakkınız kalmadı — yukarıdan ek paket satın alabilirsiniz.</div>}
        {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
      </form>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4 font-serif text-lg">Davetler</div>
        {data.invites.length === 0 ? (
          <EmptyState text="Henüz davet oluşturmadınız." />
        ) : (
          <ul className="divide-y divide-border">
            {data.invites.map((i: ProInvite) => {
              const link = typeof window !== "undefined" ? `${window.location.origin}/degerlendirme?invite=${i.token}` : "";
              const sevenqLink = typeof window !== "undefined" ? `${window.location.origin}/7q?invite=${i.token}` : "";
              return (
                <li key={i.id} className="p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{i.client_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString("tr-TR")}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${i.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {i.status === "completed" ? "Tamamlandı" : "Beklemede"}
                    </span>
                  </div>
                  {(i.session_id || i.sevenq_session_id) && (
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      {i.session_id && (
                        <Link to="/rapor/$sessionId" params={{ sessionId: i.session_id }} className="text-accent hover:underline">
                          Ölçek Raporu →
                        </Link>
                      )}
                      {i.sevenq_session_id && (
                        <Link to="/7q/rapor/$sessionId" params={{ sessionId: i.sevenq_session_id }} className="text-accent hover:underline">
                          7Q Raporu →
                        </Link>
                      )}
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">Ölçek</span>
                      <input readOnly value={link} className="flex-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs" />
                      <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="btn-outline text-xs">Kopyala</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">7Q</span>
                      <input readOnly value={sevenqLink} className="flex-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs" />
                      <button type="button" onClick={() => navigator.clipboard?.writeText(sevenqLink)} className="btn-outline text-xs">Kopyala</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Ödendi", cls: "bg-emerald-100 text-emerald-800" },
    pending: { label: "Beklemede", cls: "bg-amber-100 text-amber-800" },
    failed: { label: "Başarısız", cls: "bg-red-100 text-red-800" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-foreground" };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-sm text-muted-foreground">{text}</div>;
}
