import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  getAdminOverview,
  listAdminProducts,
  updateAdminProduct,
  listAdminUsers,
  setUserRole,
  setProQuota,
  listAdminQuestions,
  upsertQuestion,
  listWebinarSessions,
  upsertWebinarSession,
  deleteWebinarSession,
  listWebinarRegistrants,
  listAdminPosts,
  upsertPost,
  listEbookProducts,
  createEbookUploadUrl,
  deleteEbookFile,
  listAdminOrders,
  listEbookConfig,
  updateEbookDedication,
  createSignatureUploadUrl,
  createSharedSignatureUploadUrl,
  regenerateAllPersonalized,
  listProLicenses,
  revokeProLicense,
  setCertificateStatus,
  runPendingPersonalizedRetry,
} from "@/lib/admin.functions";
import {
  createProductCoverUploadUrl,
  createProductMasterUploadUrl,
  listAdminBundles,
  upsertAdminBundle,
  listAdminEditions,
  upsertAdminEdition,
  deleteAdminEdition,
} from "@/lib/admin.functions";
import { resolveBundlePrice, fmtUsd, MARKETPLACE_NAMES, AMAZON_DOMAINS } from "@/lib/bundles";
import {
  createWebinarBannerUploadUrl,
  refreshWebinarBannerUrl,
  listSiteSettings,
  upsertSiteSetting,
} from "@/lib/admin.functions";
import {
  listAdminPodcasts,
  upsertPodcastEpisode,
  deletePodcastEpisode,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (error || !data) throw redirect({ to: "/hesabim" });
  },
  head: () => ({
    meta: [
      { title: "Admin Paneli — PFA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const fmtMoney = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency.toUpperCase() }).format(
    (cents ?? 0) / 100,
  );
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";

function AdminPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-serif text-3xl text-primary">Admin Paneli</h1>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap justify-start gap-1 bg-transparent">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="products">Ürünler</TabsTrigger>
            <TabsTrigger value="bundles">Paketler</TabsTrigger>
            <TabsTrigger value="editions">Kitap Baskıları</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="pro">Pro Lisanslar</TabsTrigger>
            <TabsTrigger value="questions">PFA Ölçeği</TabsTrigger>
            <TabsTrigger value="webinars">Webinarlar</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="podcasts">Podcastler</TabsTrigger>
            <TabsTrigger value="ebooks">E-Kitaplar</TabsTrigger>
            <TabsTrigger value="orders">Siparişler</TabsTrigger>
            <TabsTrigger value="settings">Site Ayarları</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="overview"><OverviewTab /></TabsContent>
            <TabsContent value="products"><ProductsTab /></TabsContent>
            <TabsContent value="bundles"><BundlesTab /></TabsContent>
            <TabsContent value="editions"><EditionsTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="pro"><ProLicensesTab /></TabsContent>
            <TabsContent value="questions"><QuestionsTab /></TabsContent>
            <TabsContent value="webinars"><WebinarsTab /></TabsContent>
            <TabsContent value="blog"><BlogTab /></TabsContent>
            <TabsContent value="podcasts"><PodcastsTab /></TabsContent>
            <TabsContent value="ebooks"><EbooksTab /></TabsContent>
            <TabsContent value="orders"><OrdersTab /></TabsContent>
            <TabsContent value="settings"><SiteSettingsTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      {title && <h3 className="mb-3 font-serif text-lg text-primary">{title}</h3>}
      {children}
    </div>
  );
}

// ============== OVERVIEW ==============
function OverviewTab() {
  const fetchData = useServerFn(getAdminOverview);
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    fetchData().then(setD).catch((e) => console.error(e));
  }, [fetchData]);
  if (!d) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title="Toplam Gelir"><p className="text-2xl font-semibold">{fmtMoney(d.totalRevenueCents)}</p></Card>
        <Card title="Üye Sayısı"><p className="text-2xl font-semibold">{d.memberCount}</p></Card>
        <Card title="Aktif Pro"><p className="text-2xl font-semibold">{d.activePro}</p></Card>
        <Card title="Değerlendirme (30 gün)"><p className="text-2xl font-semibold">{d.miniCount} mini · {d.fullCount} tam</p></Card>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Aktif Lisanslar">
          <p className="text-2xl font-semibold">{d.activePro}</p>
          <p className="text-xs text-muted-foreground">PFA-Pro sahibi kullanıcı sayısı</p>
        </Card>
        <Card title="Danışan Değerlendirmeleri">
          <p className="text-2xl font-semibold">{d.totalClientUsed ?? 0} / {d.totalClientQuota ?? 0}</p>
          <p className="text-xs text-muted-foreground">Kullanılan / Toplam kota (tüm Pro lisansları)</p>
        </Card>
      </div>
      <Card title="Ürün Bazlı Gelir">
        <Table>
          <TableHeader><TableRow><TableHead>Ürün</TableHead><TableHead>Adet</TableHead><TableHead>Gelir</TableHead></TableRow></TableHeader>
          <TableBody>
            {d.revenueByProduct.map((r: any) => (
              <TableRow key={r.slug}><TableCell>{r.name}</TableCell><TableCell>{r.count}</TableCell><TableCell>{fmtMoney(r.cents)}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card title="Webinar Kayıtları">
        <Table>
          <TableHeader><TableRow><TableHead>Webinar</TableHead><TableHead>Kayıt</TableHead></TableRow></TableHeader>
          <TableBody>
            {d.webinarRegs.map((r: any) => (
              <TableRow key={r.slug}><TableCell>{r.name}</TableCell><TableCell>{r.count}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card title="Son 10 Sipariş">
        <Table>
          <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Ürün</TableHead><TableHead>Tutar</TableHead><TableHead>Durum</TableHead></TableRow></TableHeader>
          <TableBody>
            {d.latestOrders.map((o: any) => (
              <TableRow key={o.id}><TableCell>{fmtDate(o.created_at)}</TableCell><TableCell>{o.product_name}</TableCell><TableCell>{fmtMoney(o.amount_cents, o.currency)}</TableCell><TableCell>{o.status}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============== PRODUCTS ==============
function ProductsTab() {
  const fetchList = useServerFn(listAdminProducts);
  const update = useServerFn(updateAdminProduct);
  const createCoverUpload = useServerFn(createProductCoverUploadUrl);
  const createMasterUpload = useServerFn(createProductMasterUploadUrl);
  const [rows, setRows] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await fetchList();
    setRows(list);
    setDrafts({});
  }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);

  const dirtyIds = useMemo(() => Object.keys(drafts).filter((id) => {
    const d = drafts[id]; const orig = rows.find((r) => r.id === id);
    if (!orig || !d) return false;
    return Object.keys(d).some((k) => (d[k] ?? null) !== (orig[k] ?? null));
  }), [drafts, rows]);
  const dirty = dirtyIds.length > 0;

  const patch = (id: string, k: string, v: any) => {
    setDrafts((prev) => {
      const orig = rows.find((r) => r.id === id);
      const base = prev[id] ?? { ...orig };
      return { ...prev, [id]: { ...base, [k]: v } };
    });
    setMsg(null);
  };

  const saveAll = async () => {
    setBusy(true); setMsg(null);
    try {
      for (const id of dirtyIds) {
        const d = drafts[id]; const orig = rows.find((r) => r.id === id);
        const changed: any = { id };
        for (const k of ["name_tr","name_en","description_tr","description_en","price_cents","active","activate_at","cover_image_url","master_pdf_path","master_epub_path","language","book_key"]) {
          if ((d[k] ?? null) !== (orig?.[k] ?? null)) changed[k] = d[k];
        }
        await update({ data: changed });
      }
      await reload();
      setMsg("Kaydedildi.");
    } catch (e: any) {
      setMsg("Hata: " + (e?.message ?? "bilinmiyor"));
    } finally { setBusy(false); }
  };

  const currentValue = (p: any, k: string) => (drafts[p.id] ? drafts[p.id][k] : p[k]);

  const uploadCover = async (p: any, file: File) => {
    if (file.size > 35 * 1024 * 1024) { alert("Kapak 35 MB'ı aşamaz."); return; }
    const { path, token, publicUrl } = await createCoverUpload({ data: { slug: p.slug, filename: file.name } });
    const { error } = await supabase.storage.from("blog-images").uploadToSignedUrl(path, token, file, { upsert: true });
    if (error) { alert("Yükleme hatası: " + error.message); return; }
    patch(p.id, "cover_image_url", publicUrl);
  };
  const uploadMaster = async (p: any, file: File, format: "pdf" | "epub") => {
    if (file.size > 35 * 1024 * 1024) { alert("Dosya 35 MB'ı aşamaz."); return; }
    const { path, token } = await createMasterUpload({ data: { slug: p.slug, filename: file.name, format } });
    const { error } = await supabase.storage.from("book-files").uploadToSignedUrl(path, token, file, { upsert: true });
    if (error) { alert("Yükleme hatası: " + error.message); return; }
    patch(p.id, format === "pdf" ? "master_pdf_path" : "master_epub_path", path);
  };

  return (
    <div className="space-y-3 pb-24">
      {rows.map((p) => {
        const isBook = p.type === "ebook";
        return (
          <Card key={p.id} title={`${p.name_tr} — ${p.slug}`}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Ad (TR)</Label>
                <Input value={currentValue(p, "name_tr") ?? ""} onChange={(e) => patch(p.id, "name_tr", e.target.value)} />
              </div>
              <div>
                <Label>Ad (EN)</Label>
                <Input value={currentValue(p, "name_en") ?? ""} onChange={(e) => patch(p.id, "name_en", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Açıklama (TR)</Label>
                <Textarea value={currentValue(p, "description_tr") ?? ""} onChange={(e) => patch(p.id, "description_tr", e.target.value)} />
              </div>
              <div>
                <Label>Fiyat ($)</Label>
                <Input type="number" step="0.01" value={((currentValue(p, "price_cents") ?? 0) / 100).toFixed(2)} onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                  patch(p.id, "price_cents", isNaN(cents) ? 0 : cents);
                }} />
              </div>
              <div>
                <Label>Yayına giriş (activate_at)</Label>
                <Input type="datetime-local" value={currentValue(p, "activate_at") ? new Date(currentValue(p, "activate_at")).toISOString().slice(0,16) : ""}
                  onChange={(e) => patch(p.id, "activate_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={!!currentValue(p, "active")} onCheckedChange={(v) => patch(p.id, "active", v)} />
                <span className="text-sm">{currentValue(p, "active") ? "Aktif" : "Pasif"}</span>
              </div>
              {isBook && (
                <>
                  <div className="md:col-span-2 mt-2 border-t border-border pt-3">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Kitap Dosyaları</div>
                  </div>
                  <div>
                    <Label>Kapak görseli</Label>
                    <div className="mt-1 flex items-center gap-3">
                      {currentValue(p, "cover_image_url") && <img src={currentValue(p, "cover_image_url")} alt="kapak" className="h-20 w-auto rounded border border-border" />}
                      <input type="file" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(p, f); }} />
                    </div>
                  </div>
                  <div>
                    <Label>Master PDF</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{currentValue(p, "master_pdf_path") || "—"}</span>
                      <input type="file" accept="application/pdf,.pdf" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMaster(p, f, "pdf"); }} />
                    </div>
                  </div>
                  <div>
                    <Label>Master EPUB</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{currentValue(p, "master_epub_path") || "—"}</span>
                      <input type="file" accept=".epub,application/epub+zip" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMaster(p, f, "epub"); }} />
                    </div>
                  </div>
                  <div>
                    <Label>Dil</Label>
                    <Select value={currentValue(p, "language") ?? "tr"} onValueChange={(v) => patch(p.id, "language", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}
      <StickySaveBar dirty={dirty} count={dirtyIds.length} busy={busy} msg={msg} onSave={saveAll} onReset={() => { setDrafts({}); setMsg(null); }} />
    </div>
  );
}

function StickySaveBar({ dirty, count, busy, msg, onSave, onReset }: { dirty: boolean; count: number; busy: boolean; msg: string | null; onSave: () => void; onReset: () => void }) {
  return (
    <div className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border ${dirty ? "border-accent bg-accent/10" : "border-border bg-card"} px-5 py-2 shadow-lg backdrop-blur transition`}>
      <div className="flex items-center gap-3 text-sm">
        {dirty ? (
          <span className="text-accent">Kaydedilmemiş değişiklikler ({count})</span>
        ) : msg ? (
          <span className="text-muted-foreground">{msg}</span>
        ) : (
          <span className="text-muted-foreground">Değişiklik yok</span>
        )}
        {dirty && <Button size="sm" variant="outline" onClick={onReset} disabled={busy}>Vazgeç</Button>}
        <Button size="sm" onClick={onSave} disabled={!dirty || busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
      </div>
    </div>
  );
}

// ============== BUNDLES ==============
function BundlesTab() {
  const fetchList = useServerFn(listAdminBundles);
  const upsert = useServerFn(upsertAdminBundle);
  const [data, setData] = useState<{ bundles: any[]; products: any[] }>({ bundles: [], products: [] });
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const d = await fetchList();
    setData(d);
    setDrafts({});
  }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of data.products) m[p.slug] = p.price_cents;
    return m;
  }, [data.products]);

  const dirtyIds = useMemo(() => Object.keys(drafts).filter((id) => {
    const d = drafts[id]; const orig = data.bundles.find((r) => r.id === id);
    if (!orig || !d) return false;
    return Object.keys(d).some((k) => (d[k] ?? null) !== (orig[k] ?? null));
  }), [drafts, data.bundles]);
  const dirty = dirtyIds.length > 0;

  const patch = (id: string, k: string, v: any) => {
    setDrafts((prev) => {
      const orig = data.bundles.find((r) => r.id === id);
      const base = prev[id] ?? { ...orig };
      return { ...prev, [id]: { ...base, [k]: v } };
    });
    setMsg(null);
  };

  const saveAll = async () => {
    setBusy(true); setMsg(null);
    try {
      for (const id of dirtyIds) {
        const d = drafts[id]; const orig = data.bundles.find((r) => r.id === id);
        const changed: any = { id };
        for (const k of ["active","activate_at","sort_order","price_override_cents","discount_percent","name_tr","description_tr"]) {
          if ((d[k] ?? null) !== (orig?.[k] ?? null)) changed[k] = d[k];
        }
        await upsert({ data: changed });
      }
      await reload();
      setMsg("Kaydedildi.");
    } catch (e: any) { setMsg("Hata: " + (e?.message ?? "bilinmiyor")); } finally { setBusy(false); }
  };

  const cv = (b: any, k: string) => (drafts[b.id] ? drafts[b.id][k] : b[k]);

  return (
    <div className="space-y-3 pb-24">
      {data.bundles.map((b) => {
        const auto = resolveBundlePrice(
          { ...b, price_override_cents: null },
          priceMap,
          b.book_key === "hcd" ? "en" : "tr",
        );
        const override = cv(b, "price_override_cents");
        return (
          <Card key={b.id} title={b.name_tr}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Ad (TR)</Label>
                <Input value={cv(b, "name_tr") ?? ""} onChange={(e) => patch(b.id, "name_tr", e.target.value)} />
              </div>
              <div>
                <Label>Sıralama</Label>
                <Input type="number" value={cv(b, "sort_order") ?? 0} onChange={(e) => patch(b.id, "sort_order", parseInt(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <Label>Açıklama (TR)</Label>
                <Textarea value={cv(b, "description_tr") ?? ""} onChange={(e) => patch(b.id, "description_tr", e.target.value)} />
              </div>
              <div>
                <Label>Otomatik hesaplanan fiyat</Label>
                <div className="mt-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{fmtUsd(auto)}</div>
              </div>
              <div>
                <Label>Fiyat (override) — boşsa otomatik</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={override != null ? (override / 100).toFixed(2) : ""}
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (!v) { patch(b.id, "price_override_cents", null); return; }
                    const cents = Math.round(parseFloat(v) * 100);
                    patch(b.id, "price_override_cents", isNaN(cents) ? null : cents);
                  }}
                />
              </div>
              <div>
                <Label>İndirim (%)</Label>
                <Input type="number" value={cv(b, "discount_percent") ?? 0} onChange={(e) => patch(b.id, "discount_percent", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Yayına giriş</Label>
                <Input type="datetime-local" value={cv(b, "activate_at") ? new Date(cv(b, "activate_at")).toISOString().slice(0,16) : ""}
                  onChange={(e) => patch(b.id, "activate_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={!!cv(b, "active")} onCheckedChange={(v) => patch(b.id, "active", v)} />
                <span className="text-sm">{cv(b, "active") ? "Aktif" : "Pasif"} — {b.slug}</span>
              </div>
              <div className="md:col-span-2 text-xs text-muted-foreground">
                Bileşenler: {b.items.map((i: any) => `${i.product_slug}×${i.quantity}`).join(", ") || "—"}
                {b.includes_book && ` + kitap (${b.book_key})`}
              </div>
            </div>
          </Card>
        );
      })}
      <StickySaveBar dirty={dirty} count={dirtyIds.length} busy={busy} msg={msg} onSave={saveAll} onReset={() => { setDrafts({}); setMsg(null); }} />
    </div>
  );
}

// ============== BOOK EDITIONS ==============
function EditionsTab() {
  const fetchList = useServerFn(listAdminEditions);
  const save = useServerFn(upsertAdminEdition);
  const del = useServerFn(deleteAdminEdition);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  const marketOptions = Object.keys(AMAZON_DOMAINS);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ book_key: "pfa", format: "kindle", asin: "", external_url: "", marketplaces: [], overrides: {}, active: false, sort_order: (rows.length + 1) })}>Yeni Baskı</Button>
      </div>
      {editing && (
        <Card title={editing.id ? "Baskıyı Düzenle" : "Yeni Baskı"}>
          <EditionForm
            initial={editing}
            marketOptions={marketOptions}
            onCancel={() => setEditing(null)}
            onSave={async (d) => { await save({ data: d }); setEditing(null); reload(); }}
          />
        </Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Kitap</TableHead><TableHead>Format</TableHead><TableHead>ASIN</TableHead><TableHead>Marketler</TableHead><TableHead>Aktif</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.book_key.toUpperCase()}</TableCell>
              <TableCell>{r.format}</TableCell>
              <TableCell className="text-xs">{r.asin ?? "—"}</TableCell>
              <TableCell className="text-xs">{(r.marketplaces ?? []).join(", ") || "—"}</TableCell>
              <TableCell>{r.active ? "✓" : "—"}</TableCell>
              <TableCell className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Düzenle</Button>
                <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Silinsin mi?")) { await del({ data: { id: r.id } }); reload(); } }}>Sil</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EditionForm({ initial, marketOptions, onSave, onCancel }: { initial: any; marketOptions: string[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState<any>({ ...initial, overrides: initial.overrides ?? {}, marketplaces: initial.marketplaces ?? [] });
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
  const toggleMk = (mk: string) => {
    const set = new Set<string>(d.marketplaces ?? []);
    if (set.has(mk)) set.delete(mk); else set.add(mk);
    upd("marketplaces", Array.from(set));
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div><Label>Kitap</Label>
        <Select value={d.book_key} onValueChange={(v) => upd("book_key", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="pfa">PFA</SelectItem><SelectItem value="hcd">HCD</SelectItem></SelectContent>
        </Select>
      </div>
      <div><Label>Format</Label>
        <Select value={d.format} onValueChange={(v) => upd("format", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="kindle">Kindle</SelectItem>
            <SelectItem value="paperback">Karton Kapak</SelectItem>
            <SelectItem value="google_play">Google Play</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>ASIN</Label><Input value={d.asin ?? ""} onChange={(e) => upd("asin", e.target.value || null)} /></div>
      <div><Label>Harici URL (Google Play vs.)</Label><Input value={d.external_url ?? ""} onChange={(e) => upd("external_url", e.target.value || null)} /></div>
      <div className="md:col-span-2">
        <Label>Ülkeler</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {marketOptions.map((mk) => {
            const on = (d.marketplaces ?? []).includes(mk);
            return (
              <button key={mk} type="button" onClick={() => toggleMk(mk)}
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground/60"}`}>
                {MARKETPLACE_NAMES[mk] ?? mk}
              </button>
            );
          })}
        </div>
      </div>
      <div className="md:col-span-2">
        <Label>Override URL'ler (marketplace kodu = URL, satır başına bir tane)</Label>
        <Textarea
          value={Object.entries(d.overrides ?? {}).map(([k, v]) => `${k}=${v}`).join("\n")}
          onChange={(e) => {
            const obj: Record<string, string> = {};
            for (const line of e.target.value.split(/\r?\n/)) {
              const idx = line.indexOf("=");
              if (idx > 0) obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
            upd("overrides", obj);
          }}
          placeholder={"us=https://amazon.com/…\nde=https://amazon.de/…"}
        />
      </div>
      <div><Label>Sıralama</Label><Input type="number" value={d.sort_order ?? 0} onChange={(e) => upd("sort_order", parseInt(e.target.value) || 0)} /></div>
      <label className="flex items-end gap-2"><Switch checked={!!d.active} onCheckedChange={(v) => upd("active", v)} /> Aktif</label>
      <div className="flex gap-2 md:col-span-2">
        <Button onClick={() => onSave(d)}>Kaydet</Button>
        <Button variant="outline" onClick={onCancel}>İptal</Button>
      </div>
    </div>
  );
}

// ============== USERS ==============
function UsersTab() {
  const fetchList = useServerFn(listAdminUsers);
  const setRole = useServerFn(setUserRole);
  const setQuota = useServerFn(setProQuota);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const reload = useCallback(() => { fetchList({ data: { q } }).then(setRows); }, [fetchList, q]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="E-posta veya isim ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={reload}>Ara</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>E-posta</TableHead><TableHead>İsim</TableHead><TableHead>Roller</TableHead><TableHead>Pro Kota</TableHead><TableHead>İşlem</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((u) => {
            const isPro = u.roles.includes("pro");
            const ent = u.pro_entitlement;
            const meta = (ent?.metadata ?? {}) as any;
            return (
              <TableRow key={u.id}>
                <TableCell className="text-xs">{u.email}</TableCell>
                <TableCell className="text-xs">{u.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{u.roles.join(", ") || "user"}</TableCell>
                <TableCell>
                  {ent ? (
                    <QuotaEdit
                      entitlementId={ent.id}
                      quota={meta.client_quota ?? 0}
                      used={meta.client_used ?? 0}
                      onSave={async (quota, used) => { await setQuota({ data: { entitlement_id: ent.id, quota, used } }); reload(); }}
                    />
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant={isPro ? "outline" : "default"} onClick={async () => {
                    await setRole({ data: { user_id: u.id, role: "pro", grant: !isPro } });
                    reload();
                  }}>{isPro ? "Pro'yu Kaldır" : "Pro Ver"}</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function QuotaEdit({ quota, used, onSave }: { entitlementId: string; quota: number; used: number; onSave: (q: number, u: number) => void }) {
  const [q, setQ] = useState(quota);
  const [u, setU] = useState(used);
  return (
    <div className="flex items-center gap-1">
      <Input className="w-16" type="number" value={q} onChange={(e) => setQ(parseInt(e.target.value) || 0)} />
      <span>/</span>
      <Input className="w-16" type="number" value={u} onChange={(e) => setU(parseInt(e.target.value) || 0)} />
      <Button size="sm" variant="outline" onClick={() => onSave(q, u)}>Kaydet</Button>
    </div>
  );
}

// ============== QUESTIONS ==============
function QuestionsTab() {
  const fetchList = useServerFn(listAdminQuestions);
  const save = useServerFn(upsertQuestion);
  const [rows, setRows] = useState<any[]>([]);
  const [level, setLevel] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  const filtered = useMemo(
    () => rows.filter((r) => level === "all" || r.level === parseInt(level)),
    [rows, level],
  );
  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (let i = 1; i <= 7; i++) c[i] = rows.filter((r) => r.level === i && r.active).length;
    return c;
  }, [rows]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm seviyeler</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7].map((l) => (<SelectItem key={l} value={String(l)}>L{l}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          Aktif: {Object.entries(counts).map(([l, c]) => `L${l}: ${c}`).join(" · ")}
        </div>
        <Button className="ml-auto" onClick={() => setEditing({ text_tr: "", level: 1, reverse_coded: false, is_mini: false, active: true, sort_order: 0 })}>Yeni Soru</Button>
      </div>
      {editing && (
        <Card title={editing.id ? "Soruyu Düzenle" : "Yeni Soru"}>
          <QuestionForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={async (data) => { await save({ data }); setEditing(null); reload(); }}
          />
        </Card>
      )}
      <Table>
        <TableHeader><TableRow>
          <TableHead>Sev.</TableHead><TableHead>Metin (TR)</TableHead><TableHead>Mini</TableHead><TableHead>Ters</TableHead><TableHead>Aktif</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((q) => (
            <TableRow key={q.id}>
              <TableCell>L{q.level}</TableCell>
              <TableCell className="max-w-lg text-xs">{q.text_tr}</TableCell>
              <TableCell>{q.is_mini ? "✓" : ""}</TableCell>
              <TableCell>{q.reverse_coded ? "✓" : ""}</TableCell>
              <TableCell>{q.active ? "✓" : "—"}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => setEditing(q)}>Düzenle</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function QuestionForm({ initial, onSave, onCancel }: { initial: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
  return (
    <div className="space-y-3">
      <div><Label>Seviye</Label>
        <Select value={String(d.level)} onValueChange={(v) => upd("level", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{[1,2,3,4,5,6,7].map((l) => (<SelectItem key={l} value={String(l)}>L{l}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div><Label>Metin (TR)</Label><Textarea value={d.text_tr} onChange={(e) => upd("text_tr", e.target.value)} /></div>
      <div><Label>Metin (EN)</Label><Textarea value={d.text_en ?? ""} onChange={(e) => upd("text_en", e.target.value)} /></div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2"><Switch checked={d.is_mini} onCheckedChange={(v) => upd("is_mini", v)} /> Mini'de</label>
        <label className="flex items-center gap-2"><Switch checked={d.reverse_coded} onCheckedChange={(v) => upd("reverse_coded", v)} /> Ters kodlu</label>
        <label className="flex items-center gap-2"><Switch checked={d.active} onCheckedChange={(v) => upd("active", v)} /> Aktif</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(d)}>Kaydet</Button>
        <Button variant="outline" onClick={onCancel}>İptal</Button>
      </div>
    </div>
  );
}

// ============== WEBINARS ==============
function WebinarsTab() {
  const fetchList = useServerFn(listWebinarSessions);
  const save = useServerFn(upsertWebinarSession);
  const del = useServerFn(deleteWebinarSession);
  const regs = useServerFn(listWebinarRegistrants);
  const [data, setData] = useState<{ sessions: any[]; products: any[] }>({ sessions: [], products: [] });
  const [editing, setEditing] = useState<any | null>(null);
  const [regList, setRegList] = useState<any[] | null>(null);
  const [regTitle, setRegTitle] = useState("");
  const [sharing, setSharing] = useState<any | null>(null);
  const reload = useCallback(() => { fetchList().then(setData); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  const openRegs = async (p: any) => { setRegTitle(p.name_tr); setRegList(await regs({ data: { product_id: p.id } })); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {data.products.map((p) => (
            <Button key={p.id} size="sm" variant="outline" onClick={() => openRegs(p)}>{p.name_tr} kayıtları</Button>
          ))}
        </div>
        <Button onClick={() => setEditing({ product_id: data.products[0]?.id ?? "", title: "", starts_at: new Date().toISOString().slice(0,16), capacity: null, join_url: "", notes: "" })}>Yeni Oturum</Button>
      </div>
      {regList && (
        <Card title={`Kayıtlı: ${regTitle}`}>
          <Button size="sm" variant="outline" className="mb-2" onClick={() => setRegList(null)}>Kapat</Button>
          <Table>
            <TableHeader><TableRow><TableHead>Ad</TableHead><TableHead>E-posta</TableHead><TableHead>Tarih</TableHead></TableRow></TableHeader>
            <TableBody>{regList.map((r) => (<TableRow key={r.order_id}><TableCell>{r.full_name ?? "—"}</TableCell><TableCell>{r.email ?? "—"}</TableCell><TableCell>{fmtDate(r.created_at)}</TableCell></TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
      {editing && (
        <Card title={editing.id ? "Oturumu Düzenle" : "Yeni Oturum"}>
          <WebinarForm
            initial={editing}
            products={data.products}
            onCancel={() => setEditing(null)}
            onSave={async (d) => { await save({ data: d }); setEditing(null); reload(); }}
          />
        </Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Başlık</TableHead><TableHead>Ürün</TableHead><TableHead>Tarih</TableHead><TableHead>Kapasite</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {data.sessions.map((s) => {
            const p = data.products.find((x) => x.id === s.product_id);
            return (
              <TableRow key={s.id}>
                <TableCell>{s.title}</TableCell><TableCell>{p?.name_tr ?? "—"}</TableCell><TableCell>{fmtDate(s.starts_at)}</TableCell><TableCell>{s.capacity ?? "—"}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...s, starts_at: new Date(s.starts_at).toISOString().slice(0,16) })}>Düzenle</Button>
                  <Button size="sm" variant="outline" onClick={() => setSharing({ ...s, product: p })}>Paylaş</Button>
                  <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Silinsin mi?")) { await del({ data: { id: s.id } }); reload(); } }}>Sil</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {sharing && <ShareKitModal session={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

function WebinarForm({ initial, products, onSave, onCancel }: { initial: any; products: any[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const createUpload = useServerFn(createWebinarBannerUploadUrl);
  const [busy, setBusy] = useState(false);
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
  const uploadBanner = async (file: File) => {
    if (!d.id) { alert("Önce oturumu kaydedin, sonra görsel yükleyin."); return; }
    setBusy(true);
    try {
      const { path, token, publicUrl } = await createUpload({ data: { session_id: d.id, filename: file.name } });
      const { error } = await supabase.storage.from("webinar-banners").uploadToSignedUrl(path, token, file, { upsert: true });
      if (error) throw error;
      upd("banner_url", publicUrl);
    } catch (e: any) {
      alert("Yükleme hatası: " + (e?.message ?? "bilinmiyor"));
    } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div><Label>Ürün</Label>
        <Select value={d.product_id} onValueChange={(v) => upd("product_id", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name_tr}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div><Label>Başlık</Label><Input value={d.title} onChange={(e) => upd("title", e.target.value)} /></div>
      <div><Label>Tarih & Saat</Label><Input type="datetime-local" value={d.starts_at} onChange={(e) => upd("starts_at", e.target.value)} /></div>
      <div><Label>Kapasite</Label><Input type="number" value={d.capacity ?? ""} onChange={(e) => upd("capacity", e.target.value ? parseInt(e.target.value) : null)} /></div>
      <div className="md:col-span-2"><Label>Katılım linki</Label><Input value={d.join_url ?? ""} onChange={(e) => upd("join_url", e.target.value)} /></div>
      <div className="md:col-span-2"><Label>Notlar</Label><Textarea value={d.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} /></div>
      <div className="md:col-span-2">
        <Label>Webinar Görseli</Label>
        <div className="mt-2 flex items-center gap-3">
          {d.banner_url && <img src={d.banner_url} alt="banner" className="h-20 w-auto rounded border border-border" />}
          <input
            type="file"
            accept="image/*"
            disabled={busy || !d.id}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); }}
            className="text-sm"
          />
          {!d.id && <span className="text-xs text-muted-foreground">Önce kaydedin, sonra görsel yükleyin.</span>}
        </div>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button onClick={() => onSave({ ...d, starts_at: new Date(d.starts_at).toISOString(), capacity: d.capacity || null, join_url: d.join_url || null, notes: d.notes || null, banner_url: d.banner_url || null })}>Kaydet</Button>
        <Button variant="outline" onClick={onCancel}>İptal</Button>
      </div>
    </div>
  );
}

// ============== SHARE KIT ==============
function ShareKitModal({ session, onClose }: { session: any; onClose: () => void }) {
  const productSlug = session.product?.slug ?? "";
  const publicUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = productSlug === "pfa-pro-lisans-paketi" ? "/webinarlar/pfa-pro"
      : productSlug === "bilinc-seviyeleri-calismalari" ? "/webinarlar/bilinc-seviyeleri"
      : "/webinarlar";
    return `${origin}${path}`;
  }, [productSlug]);
  const priceCents = session.product?.price_cents;
  const dateStr = new Date(session.starts_at).toLocaleString("tr-TR", {
    dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul",
  });
  const priceLine = typeof priceCents === "number" ? `\n💰 $${(priceCents / 100).toFixed(0)}` : "";
  const defaultText =
    `${session.title}\n📅 ${dateStr} (İstanbul)${priceLine}\n\n${session.notes ? session.notes.split("\n")[0] : "PFA — Psİko-Fonksİyonel Analİz webinarı."}\n\nKayıt: ${publicUrl}`;
  const [text, setText] = useState(defaultText);
  const encoded = encodeURIComponent(text);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };
  const downloadImage = async () => {
    if (!session.banner_url) { alert("Bu oturuma görsel yüklenmemiş."); return; }
    try {
      const r = await fetch(session.banner_url);
      const b = await r.blob();
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webinar-${session.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Görsel indirilemedi."); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-primary">Paylaşım Kiti</h3>
          <Button size="sm" variant="outline" onClick={onClose}>Kapat</Button>
        </div>
        {session.banner_url && (
          <img src={session.banner_url} alt="banner" className="mb-4 max-h-56 w-auto rounded border border-border" />
        )}
        <Label>Paylaşım metni</Label>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a className="btn-primary hover:btn-primary-hover text-center" href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noreferrer">WhatsApp'ta Paylaş</a>
          <a className="btn-primary hover:btn-primary-hover text-center" href={`https://twitter.com/intent/tweet?text=${encoded}`} target="_blank" rel="noreferrer">X'te Paylaş</a>
          <a className="btn-primary hover:btn-primary-hover text-center" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noreferrer">LinkedIn'de Paylaş</a>
          <Button variant="outline" onClick={() => copy("text", text)}>{copied === "text" ? "Kopyalandı ✓" : "Metni Kopyala"}</Button>
          <Button variant="outline" onClick={() => copy("link", publicUrl)}>{copied === "link" ? "Kopyalandı ✓" : "Linki Kopyala"}</Button>
          <Button variant="outline" onClick={downloadImage} disabled={!session.banner_url}>Görseli İndir</Button>
        </div>
        <p className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <span className="font-medium">Instagram için:</span> Instagram web ön-paylaşımı desteklemiyor —
          "Görseli İndir" + "Metni Kopyala" ile mobil uygulamadan paylaşın.
          Tam otomatik paylaşım için platform API'leri gerekir; bu kit tek tıkla manuel paylaşımdır.
        </p>
      </div>
    </div>
  );
}

// ============== SITE SETTINGS ==============
function SiteSettingsTab() {
  const fetchList = useServerFn(listSiteSettings);
  const save = useServerFn(upsertSiteSetting);
  const [rows, setRows] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetchList().then((data) => {
      const out: Record<string, string> = { social_instagram: "", social_linkedin: "", social_x: "", social_youtube: "", podcast_program_url: "" };
      for (const r of data as any[]) out[r.key] = r.value ?? "";
      setRows(out);
    });
  }, [fetchList]);
  const upd = (k: string, v: string) => setRows((r) => ({ ...r, [k]: v }));
  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      for (const [k, v] of Object.entries(rows)) {
        await save({ data: { key: k, value: v } });
      }
      setMsg("Kaydedildi.");
    } catch (e: any) {
      setMsg("Hata: " + (e?.message ?? "bilinmiyor"));
    } finally { setBusy(false); }
  };
  return (
    <Card title="Sosyal Medya Bağlantıları">
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Instagram URL</Label><Input placeholder="https://instagram.com/…" value={rows.social_instagram ?? ""} onChange={(e) => upd("social_instagram", e.target.value)} /></div>
        <div><Label>LinkedIn URL</Label><Input placeholder="https://linkedin.com/in/…" value={rows.social_linkedin ?? ""} onChange={(e) => upd("social_linkedin", e.target.value)} /></div>
        <div><Label>X (Twitter) URL</Label><Input placeholder="https://x.com/…" value={rows.social_x ?? ""} onChange={(e) => upd("social_x", e.target.value)} /></div>
        <div><Label>YouTube URL</Label><Input placeholder="https://youtube.com/@…" value={rows.social_youtube ?? ""} onChange={(e) => upd("social_youtube", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Spotify Podcast Program URL</Label><Input placeholder="https://open.spotify.com/show/…" value={rows.podcast_program_url ?? ""} onChange={(e) => upd("podcast_program_url", e.target.value)} /></div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Boş bırakılan alanlar footer'da gösterilmez.</p>
    </Card>
  );
}

// ============== BLOG ==============
function BlogTab() {
  const fetchList = useServerFn(listAdminPosts);
  const save = useServerFn(upsertPost);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ slug: "", title: "", seo_description: "", content: "", cover_image_url: "", published: false, sort_order: (rows.length + 1) })}>Yeni Yazı</Button>
      </div>
      {editing && (
        <Card title={editing.id ? "Yazıyı Düzenle" : "Yeni Yazı"}>
          <BlogForm initial={editing} onCancel={() => setEditing(null)} onSave={async (d) => { await save({ data: d }); setEditing(null); reload(); }} />
        </Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Sıra</TableHead><TableHead>Başlık</TableHead><TableHead>Slug</TableHead><TableHead>Yayında</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.sort_order}</TableCell>
              <TableCell>{p.title}</TableCell>
              <TableCell className="text-xs">{p.slug}</TableCell>
              <TableCell>
                <Switch checked={p.published} onCheckedChange={async (v) => { await save({ data: { id: p.id, slug: p.slug, title: p.title, seo_description: p.seo_description, content: p.content, published: v, sort_order: p.sort_order, cover_image_url: p.cover_image_url } }); reload(); }} />
              </TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => setEditing(p)}>Düzenle</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BlogForm({ initial, onSave, onCancel }: { initial: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [preview, setPreview] = useState(false);
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Başlık</Label><Input value={d.title} onChange={(e) => upd("title", e.target.value)} /></div>
        <div><Label>Slug</Label><Input value={d.slug} onChange={(e) => upd("slug", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>SEO açıklama</Label><Input value={d.seo_description} onChange={(e) => upd("seo_description", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Kapak görseli URL</Label><Input value={d.cover_image_url ?? ""} onChange={(e) => upd("cover_image_url", e.target.value)} /></div>
        <div><Label>Sıra</Label><Input type="number" value={d.sort_order} onChange={(e) => upd("sort_order", parseInt(e.target.value) || 0)} /></div>
        <label className="flex items-end gap-2"><Switch checked={d.published} onCheckedChange={(v) => upd("published", v)} /> Yayında</label>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>İçerik (Markdown)</Label>
          <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>{preview ? "Düzenle" : "Önizle"}</Button>
        </div>
        {preview ? (
          <div className="prose prose-sm max-w-none rounded border border-border bg-background p-4">
            <ReactMarkdown>{d.content}</ReactMarkdown>
          </div>
        ) : (
          <Textarea rows={18} value={d.content} onChange={(e) => upd("content", e.target.value)} />
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave({ ...d, cover_image_url: d.cover_image_url || null })}>Kaydet</Button>
        <Button variant="outline" onClick={onCancel}>İptal</Button>
      </div>
    </div>
  );
}

// ============== PODCASTS ==============
function PodcastsTab() {
  const fetchList = useServerFn(listAdminPodcasts);
  const save = useServerFn(upsertPodcastEpisode);
  const del = useServerFn(deletePodcastEpisode);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  const submit = async (d: any) => {
    setErr(null);
    try {
      await save({ data: d });
      setEditing(null);
      reload();
    } catch (e: any) {
      setErr(e?.message ?? "Kaydedilemedi");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Bölüm silinsin mi?")) return;
    await del({ data: { id } });
    reload();
  };
  const nextNum = (rows.reduce((m, r) => Math.max(m, r.episode_number ?? 0), 0) + 1) || 1;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ episode_number: nextNum, title: "", description: "", spotify_url: "", published: true })}>Yeni Bölüm</Button>
      </div>
      {editing && (
        <Card title={editing.id ? "Bölümü Düzenle" : "Yeni Bölüm"}>
          <PodcastForm initial={editing} onCancel={() => { setEditing(null); setErr(null); }} onSave={submit} />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
        </Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Başlık</TableHead><TableHead>Spotify</TableHead><TableHead>Yayında</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.episode_number}</TableCell>
              <TableCell>{p.title}</TableCell>
              <TableCell className="text-xs"><a href={p.spotify_url} target="_blank" rel="noopener noreferrer" className="underline">aç</a></TableCell>
              <TableCell>
                <Switch checked={p.published} onCheckedChange={async (v) => { await save({ data: { id: p.id, episode_number: p.episode_number, title: p.title, description: p.description ?? "", spotify_url: p.spotify_url, published: v } }); reload(); }} />
              </TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Düzenle</Button>
                <Button size="sm" variant="outline" onClick={() => remove(p.id)}>Sil</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PodcastForm({ initial, onSave, onCancel }: { initial: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState<any>(initial);
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Bölüm No</Label><Input type="number" value={d.episode_number} onChange={(e) => upd("episode_number", parseInt(e.target.value) || 0)} /></div>
        <label className="flex items-end gap-2"><Switch checked={d.published} onCheckedChange={(v) => upd("published", v)} /> Yayında</label>
        <div className="md:col-span-2"><Label>Başlık</Label><Input value={d.title} onChange={(e) => upd("title", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Spotify Bölüm URL</Label><Input placeholder="https://open.spotify.com/episode/…" value={d.spotify_url} onChange={(e) => upd("spotify_url", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Açıklama</Label><Textarea rows={6} value={d.description ?? ""} onChange={(e) => upd("description", e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">Embed URL, Spotify bağlantısından otomatik türetilir.</p>
      <div className="flex gap-2">
        <Button onClick={() => onSave({
          id: d.id,
          episode_number: Number(d.episode_number),
          title: d.title,
          description: d.description ?? "",
          spotify_url: d.spotify_url,
          published: !!d.published,
        })}>Kaydet</Button>
        <Button variant="outline" onClick={onCancel}>İptal</Button>
      </div>
    </div>
  );
}

// ============== EBOOKS ==============
function EbooksTab() {
  const fetchList = useServerFn(listEbookProducts);
  const createUpload = useServerFn(createEbookUploadUrl);
  const del = useServerFn(deleteEbookFile);
  const fetchCfg = useServerFn(listEbookConfig);
  const saveDed = useServerFn(updateEbookDedication);
  const createSigUpload = useServerFn(createSignatureUploadUrl);
  const createSharedSig = useServerFn(createSharedSignatureUploadUrl);
  const regen = useServerFn(regenerateAllPersonalized);
  const runRetry = useServerFn(runPendingPersonalizedRetry);
  const [rows, setRows] = useState<any[]>([]);
  const [cfg, setCfg] = useState<any[]>([]);
  const [regenMsg, setRegenMsg] = useState<string | null>(null);
  const [sigMsg, setSigMsg] = useState<string | null>(null);
  const [sigBusy, setSigBusy] = useState(false);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  const reloadCfg = useCallback(() => { fetchCfg().then(setCfg); }, [fetchCfg]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { reloadCfg(); }, [reloadCfg]);
  const onUpload = async (slug: string, file: File) => {
    const { path, token } = await createUpload({ data: { slug, filename: file.name } });
    const { error } = await supabase.storage.from("ebooks").uploadToSignedUrl(path, token, file, { upsert: true });
    if (error) { alert(error.message); return; }
    reload();
  };
  const onSharedSignatureUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".png")) { alert("İmza şeffaf PNG olmalı."); return; }
    setSigBusy(true);
    setSigMsg(null);
    try {
      const { path, token } = await createSharedSig({ data: { filename: file.name } });
      const { error } = await supabase.storage.from("ebooks").uploadToSignedUrl(path, token, file, { upsert: true });
      if (error) throw error;
      setSigMsg("İmza yüklendi. Bekleyen kişisel PDF'ler üretiliyor…");
      reloadCfg();
      try {
        const r = await runRetry({ data: undefined as unknown as never });
        setSigMsg(`İmza yüklendi · ${r.generated} kişisel PDF üretildi, ${r.skipped} atlandı.`);
      } catch (err: any) {
        setSigMsg(`İmza yüklendi. Retry başarısız: ${err?.message ?? "hata"}`);
      }
    } catch (e: any) {
      setSigMsg(`Hata: ${e?.message ?? "yüklenemedi"}`);
    } finally {
      setSigBusy(false);
    }
  };
  // Suppress unused var warnings while keeping the per-locale endpoint available.
  void createSigUpload;
  return (
    <div className="space-y-6">
      <Card title="İmzalı Nüsha — Şablonlar & İmza">
        <p className="mb-4 text-xs text-muted-foreground">
          Dedication metninde <code>{"{{FULL_NAME}}"}</code>, footer'da <code>{"{{EMAIL}}"}</code> yer tutucularını kullanabilirsiniz. İmza görselini şeffaf arka planlı PNG olarak yükleyin. Master PDF ve imza mevcutsa alıcı ilk okuduğunda kişisel nüsha üretilir.
        </p>
        <div className="space-y-4">
          {cfg.map((c) => (
            <DedicationEditor
              key={c.id}
              cfg={c}
              onSave={async (patch) => { await saveDed({ data: { id: c.id, ...patch } }); reloadCfg(); }}
            />
          ))}
        </div>
        <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Yazar İmzası (TR + EN ortak)</div>
            <div className="text-xs text-muted-foreground">
              {cfg[0]?.signature_path ? <>Kayıtlı: <code className="text-foreground/70">{cfg[0].signature_path}</code></> : "İmza yüklenmedi"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept=".png,image/png"
              disabled={sigBusy}
              className="max-w-[320px]"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onSharedSignatureUpload(f); }}
            />
            {sigBusy && <span className="text-xs text-muted-foreground">Yükleniyor…</span>}
            {sigMsg && <span className="text-xs text-muted-foreground">{sigMsg}</span>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Şeffaf zeminli PNG. Yüklendiğinde daha önce üretilmiş kişisel PDF'ler otomatik temizlenir ve alıcı ilk açtığında yeniden üretilir.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={async () => {
            const r = await runRetry({ data: undefined as unknown as never });
            setRegenMsg(`Retry: ${r.generated} üretildi, ${r.skipped} atlandı.`);
          }}>Bekleyen Kişisel PDF'leri Üret</Button>
          <Button variant="outline" size="sm" onClick={async () => {
            if (!confirm("Tüm kişisel PDF'ler silinsin ve yeniden üretilsin mi?")) return;
            const r = await regen({ data: undefined as unknown as never });
            setRegenMsg(`${r.cleared} dosya temizlendi.`);
            reloadCfg();
          }}>Kişisel PDF'leri Yeniden Üret</Button>
          {regenMsg && <span className="text-xs text-muted-foreground">{regenMsg}</span>}
        </div>
      </Card>

      {rows.map((p) => (
        <Card key={p.slug} title={p.name}>
          <div className="mb-2 space-y-1">
            {p.files.length === 0 && <p className="text-sm text-muted-foreground">Dosya yok.</p>}
            {p.files.map((f: any) => (
              <div key={f.name} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{f.name} {f.size ? `(${(f.size/1024/1024).toFixed(2)} MB)` : ""}</span>
                <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Silinsin mi?")) { await del({ data: { slug: p.slug, filename: f.name } }); reload(); } }}>Sil</Button>
              </div>
            ))}
          </div>
          <Input type="file" accept=".pdf,.epub" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(p.slug, f); }} />
        </Card>
      ))}
    </div>
  );
}

function DedicationEditor({ cfg, onSave }: {
  cfg: any;
  onSave: (patch: { body_template: string; footer_template: string; author_name: string }) => void;
}) {
  const [body, setBody] = useState<string>(cfg.body_template);
  const [footer, setFooter] = useState<string>(cfg.footer_template);
  const [author, setAuthor] = useState<string>(cfg.author_name ?? "Burak Akçakanat");
  return (
    <div className="rounded-md border border-border/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">{cfg.locale.toUpperCase()} · Dedication Şablonu</div>
      </div>
      <div className="space-y-3">
        <div><Label>Yazar adı</Label><Input value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
        <div><Label>Dedication metni</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div><Label>Sayfa altı (footer)</Label><Input value={footer} onChange={(e) => setFooter(e.target.value)} /></div>
        <div>
          <Button size="sm" onClick={() => onSave({ body_template: body, footer_template: footer, author_name: author })}>Kaydet</Button>
        </div>
      </div>
    </div>
  );
}

// ============== ORDERS ==============
function OrdersTab() {
  const fetchList = useServerFn(listAdminOrders);
  const fetchProducts = useServerFn(listAdminProducts);
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const reload = useCallback(() => {
    fetchList({ data: { status: status === "all" ? undefined : status, product_id: productId === "all" ? undefined : productId } }).then(setRows);
  }, [fetchList, status, productId]);
  useEffect(() => { fetchProducts().then(setProducts); }, [fetchProducts]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="pending">Beklemede</SelectItem>
            <SelectItem value="paid">Ödendi</SelectItem>
            <SelectItem value="refunded">İade</SelectItem>
            <SelectItem value="failed">Başarısız</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Ürün" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm ürünler</SelectItem>
            {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name_tr}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>E-posta</TableHead><TableHead>Ürün</TableHead><TableHead>Tutar</TableHead><TableHead>Durum</TableHead><TableHead>Stripe</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="text-xs">{fmtDate(o.created_at)}</TableCell>
              <TableCell className="text-xs">{o.email ?? "—"}</TableCell>
              <TableCell>{o.product_name}</TableCell>
              <TableCell>{fmtMoney(o.amount_cents, o.currency)}</TableCell>
              <TableCell>{o.status}</TableCell>
              <TableCell className="max-w-[16ch] truncate text-xs">{o.stripe_session_id ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
// ============== PRO LICENSES ==============
function ProLicensesTab() {
  const fetchList = useServerFn(listProLicenses);
  const setQuota = useServerFn(setProQuota);
  const revoke = useServerFn(revokeProLicense);
  const setCert = useServerFn(setCertificateStatus);
  const [rows, setRows] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Toplam {rows.length} aktif lisans · {rows.reduce((s, r) => s + r.used, 0)} /{" "}
        {rows.reduce((s, r) => s + r.quota, 0)} danışan değerlendirmesi kullanıldı.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Ad</TableHead>
            <TableHead>Satın alma</TableHead>
            <TableHead>Kota (kullanılan / toplam)</TableHead>
            <TableHead>Kalan</TableHead>
            <TableHead>Sertifika</TableHead>
            <TableHead>İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <>
              <TableRow key={r.entitlement_id}>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setExpanded((s) => ({ ...s, [r.entitlement_id]: !s[r.entitlement_id] }))}>
                    {expanded[r.entitlement_id] ? "▾" : "▸"}
                  </Button>
                </TableCell>
                <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{fmtDate(r.purchased_at)}</TableCell>
                <TableCell>
                  <QuotaEdit
                    entitlementId={r.entitlement_id}
                    quota={r.quota}
                    used={r.used}
                    onSave={async (q, u) => { await setQuota({ data: { entitlement_id: r.entitlement_id, quota: q, used: u } }); reload(); }}
                  />
                </TableCell>
                <TableCell className="text-xs">{r.remaining}</TableCell>
                <TableCell>
                  <Select value={r.certificate_status} onValueChange={async (v: any) => { await setCert({ data: { entitlement_id: r.entitlement_id, status: v } }); reload(); }}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="issued">Verildi</SelectItem>
                      <SelectItem value="revoked">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    if (!confirm(`${r.email ?? "Kullanıcı"} için Pro lisansını iptal etmek istediğinizden emin misiniz?`)) return;
                    await revoke({ data: { user_id: r.user_id, entitlement_id: r.entitlement_id } });
                    reload();
                  }}>Lisansı İptal Et</Button>
                </TableCell>
              </TableRow>
              {expanded[r.entitlement_id] && (
                <TableRow key={r.entitlement_id + "-inv"}>
                  <TableCell colSpan={8} className="bg-muted/30">
                    <div className="p-3">
                      <div className="mb-2 text-xs font-medium">Danışan Davetleri ({r.invites.length})</div>
                      {r.invites.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Bu Pro henüz danışan daveti oluşturmadı.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Danışan</TableHead>
                              <TableHead>Durum</TableHead>
                              <TableHead>Oluşturulma</TableHead>
                              <TableHead>Rapor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.invites.map((inv: any) => (
                              <TableRow key={inv.id}>
                                <TableCell className="text-xs">{inv.client_name}</TableCell>
                                <TableCell className="text-xs">{inv.status}</TableCell>
                                <TableCell className="text-xs">{fmtDate(inv.created_at)}</TableCell>
                                <TableCell className="text-xs">
                                  {inv.status === "completed" ? (
                                    <a className="text-accent underline" href={`/rapor/${inv.token}`} target="_blank" rel="noreferrer">Rapora git</a>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
