import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/hesabim")({
  head: () => ({
    meta: [
      { title: "Hesabım — PFA" },
      { name: "description", content: "PFA hesap paneli: profil, satın alımlar, raporlar, e-book'lar ve webinar kayıtları." },
    ],
  }),
  component: AccountPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  preferred_language: string;
};

type Order = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  products: { name_tr: string; slug: string } | null;
};

type Entitlement = {
  id: string;
  type: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

type AssessmentSessionRow = {
  id: string;
  type: "mini" | "full";
  status: string;
  created_at: string;
  completed_at: string | null;
};

const TABS = [
  { id: "profile", label: "Profil" },
  { id: "orders", label: "Satın Alımlarım" },
  { id: "reports", label: "Raporlarım" },
  { id: "ebooks", label: "E-Book'larım" },
  { id: "webinars", label: "Webinar Kayıtlarım" },
] as const;

function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSessionRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [tab, setTab] = useState<string>("profile");
  const [fullName, setFullName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("tr");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;

      const [{ data: p }, { data: o }, { data: e }, { data: r }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("orders")
          .select("id,status,amount_cents,currency,created_at,products(name_tr,slug)")
          .order("created_at", { ascending: false }),
        supabase.from("user_entitlements").select("id,type,created_at,metadata").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role"),
        supabase
          .from("assessment_sessions")
          .select("id, type, status, created_at, completed_at")
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
      ]);
      if (p) {
        setProfile(p as Profile);
        setFullName((p as Profile).full_name ?? "");
        setPreferredLanguage((p as Profile).preferred_language ?? "tr");
      }
      setOrders((o ?? []) as unknown as Order[]);
      setEntitlements((e ?? []) as unknown as Entitlement[]);
      setRoles(((r ?? []) as { role: string }[]).map((x) => x.role));
      setAssessments((a ?? []) as unknown as AssessmentSessionRow[]);
    })();
  }, []);

  const isPro = roles.includes("pro") || roles.includes("admin");
  const tabs = isPro ? [...TABS, { id: "clients", label: "Danışanlarım" }] : TABS;

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, preferred_language: preferredLanguage })
      .eq("id", profile.id);
    setSaving(false);
    setMsg(error ? `Hata: ${error.message}` : "Kaydedildi.");
  }

  const ebooks = entitlements.filter((x) => x.type === "ebook");
  const webinars = entitlements.filter((x) => x.type === "webinar_bsc" || x.type === "pfa_pro");

  return (
    <div className="container-page py-16">
      <header className="max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Hesabım</div>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Hoş geldiniz</h1>
        <p className="mt-4 text-sm text-muted-foreground">Profilinizi, satın alımlarınızı ve yetkilerinizi buradan yönetin.</p>
      </header>

      <div className="mt-10 flex flex-wrap gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${tab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 max-w-3xl">
        {tab === "profile" && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground/80">E-posta</span>
              <input readOnly value={profile?.email ?? ""} className="w-full rounded-md border border-border bg-muted/40 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground/80">Ad Soyad</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground/80">Dil Tercihi</span>
              <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={saveProfile} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? "..." : "Kaydet"}
              </button>
              {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="rounded-lg border border-border bg-card">
            {orders.length === 0 ? (
              <EmptyState text="Henüz bir satın alımınız yok." />
            ) : (
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
        )}

        {tab === "reports" && (
          <div className="rounded-lg border border-border bg-card">
            {assessments.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Henüz bir raporunuz yok. <Link to="/degerlendirme" className="text-accent">Değerlendirmeye başla →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {assessments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-medium">
                        {a.type === "full" ? "Tam Assessment Raporu" : "Mini Değerlendirme"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.completed_at ?? a.created_at).toLocaleString("tr-TR")}
                      </div>
                    </div>
                    <Link to="/rapor/$sessionId" params={{ sessionId: a.id }} className="text-accent hover:underline">
                      Görüntüle →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "ebooks" && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {ebooks.length === 0
              ? <>E-book'larınız burada görünecek. <Link to="/kitaplar" className="text-accent">Kitaplara göz at →</Link></>
              : <ul className="space-y-2">{ebooks.map((e) => <li key={e.id}>PFA E-Book — indirme linki hazırlanıyor.</li>)}</ul>}
          </div>
        )}

        {tab === "webinars" && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {webinars.length === 0
              ? <>Webinar kayıtlarınız burada görünecek. <Link to="/webinarlar" className="text-accent">Webinarları gör →</Link></>
              : <ul className="space-y-2">{webinars.map((w) => <li key={w.id}>{w.type === "pfa_pro" ? "PFA-Pro Lisans Paketi" : "Bilinç Seviyeleri Çalışmaları"} — {new Date(w.created_at).toLocaleDateString("tr-TR")}</li>)}</ul>}
          </div>
        )}

        {tab === "clients" && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            PFA-Pro danışan paneli yakında aktif olacak.
          </div>
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