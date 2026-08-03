import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isLive } from "@/lib/bundles";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { listContactMessages, markContactMessageRead, deleteContactMessage } from "@/lib/contact.functions";
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
  getInstrumentVersionState,
  bumpInstrumentVersion,
  getInstrumentVersionInventory,
  diffInstrumentVersions,
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
  listProAccounts,
  listProInvitesForAdmin,
  searchProfilesForPro,
  grantProAccount,
  revokeProAccount,
  addProCredits,
} from "@/lib/admin.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  refreshWebinarBannerUrl,
  listSiteSettings,
  upsertSiteSetting,
} from "@/lib/admin.functions";
import {
  listAdminPodcasts,
  upsertPodcastEpisode,
  deletePodcastEpisode,
} from "@/lib/admin.functions";
import {
  listAdminPractitioners,
  upsertAdminPractitioner,
  deleteAdminPractitioner,
  createPractitionerPhotoUploadUrl,
  listAdminPractitionerInquiries,
  updatePractitionerInquiryStatus,
} from "@/lib/admin.functions";
import {
  listAdminApplications,
  getAdminApplicationFileUrl,
  updateAdminApplication,
  acceptApplicationAsPractitioner,
  makeUserPractitioner,
  type AdminApplicationRow,
  type ApplicationStatus,
} from "@/lib/practitioner-applications.functions";
import { AdminLicenseInquiries } from "@/components/admin-license-inquiries";
import {
  listNewsletterSubscribers,
  deleteNewsletterSubscriber,
  listNewsletterIssues,
  upsertNewsletterIssue,
  deleteNewsletterIssue,
  sendNewsletterIssue,
  sendNewsletterTest,
  getNewsletterConfigStatus,
  listNewsletterUnsubscribed,
} from "@/lib/newsletter.functions";
import { MediaLibraryManager, MediaPickerButton } from "@/components/media-library";
import {
  FREE_LABEL_TR,
  buildInstagramCaptionEn,
  buildInstagramCaptionTr,
  buildWebinarDrafts,
  formatWebinarPrice,
  openingLine,
  shareLinks,
} from "@/lib/social-drafts";

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
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="products">Ürünler ve Paketler</TabsTrigger>
            <TabsTrigger value="editions">Kitap Baskıları</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="pro">Pro Lisanslar</TabsTrigger>
            <TabsTrigger value="pro-accounts">Pro Hesaplar</TabsTrigger>
            <TabsTrigger value="questions">PFA Ölçeği</TabsTrigger>
            <TabsTrigger value="webinars">Webinarlar</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="media">Görseller</TabsTrigger>
            <TabsTrigger value="podcasts">Podcastler</TabsTrigger>
            <TabsTrigger value="ebooks">E-Kitaplar</TabsTrigger>
            <TabsTrigger value="orders">Siparişler</TabsTrigger>
            <TabsTrigger value="settings">Site Ayarları</TabsTrigger>
            <TabsTrigger value="practitioners">Uygulayıcılar</TabsTrigger>
            <TabsTrigger value="newsletter">Bülten</TabsTrigger>
            <TabsTrigger value="messages">Mesajlar</TabsTrigger>
            <TabsTrigger value="licenses">Lisans Başvuruları</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="overview"><OverviewTab /></TabsContent>
            <TabsContent value="products"><ProductsTab /></TabsContent>
            <TabsContent value="editions"><EditionsTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="pro"><ProLicensesTab /></TabsContent>
            <TabsContent value="pro-accounts"><ProAccountsTab /></TabsContent>
            <TabsContent value="questions"><QuestionsTab /></TabsContent>
            <TabsContent value="webinars"><WebinarsTab /></TabsContent>
            <TabsContent value="blog"><BlogTab /></TabsContent>
            <TabsContent value="media"><MediaLibraryManager /></TabsContent>
            <TabsContent value="podcasts"><PodcastsTab /></TabsContent>
            <TabsContent value="ebooks"><EbooksTab /></TabsContent>
            <TabsContent value="orders"><OrdersTab /></TabsContent>
            <TabsContent value="settings"><SiteSettingsTab /></TabsContent>
            <TabsContent value="practitioners"><PractitionersTab /></TabsContent>
            <TabsContent value="newsletter"><NewsletterTab /></TabsContent>
            <TabsContent value="messages"><MessagesTab /></TabsContent>
            <TabsContent value="licenses"><AdminLicenseInquiries /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function MessagesTab() {
  const listFn = useServerFn(listContactMessages);
  const markFn = useServerFn(markContactMessageRead);
  const deleteFn = useServerFn(deleteContactMessage);
  const [rows, setRows] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listFn();
      setRows(r.messages);
      setUnread(r.unread);
    } catch (e: any) {
      toast.error(e?.message ?? "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { load(); }, [load]);

  const toggleRead = async (id: string, is_read: boolean) => {
    try {
      await markFn({ data: { id, is_read } });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    }
  };

  const removeMessage = async (id: string) => {
    if (!window.confirm("Bu mesaj kalıcı olarak silinecek. Emin misiniz?")) return;
    try {
      await deleteFn({ data: { id } });
      if (openId === id) setOpenId(null);
      toast.success("Mesaj kalıcı olarak silindi");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Silinemedi");
    }
  };

  return (
    <Card title={`İletişim Mesajları${unread > 0 ? ` (${unread} okunmamış)` : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>Yenile</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz mesaj yok.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => {
            const isOpen = openId === m.id;
            return (
              <div
                key={m.id}
                className={`rounded-md border p-3 ${m.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
              >
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!m.is_read && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-label="okunmamış" />
                      )}
                      <span className="font-medium">{m.full_name}</span>
                      <span className="text-xs text-muted-foreground">&lt;{m.email}&gt;</span>
                    </div>
                    <div className="mt-0.5 text-sm text-foreground/80">
                      {m.subject || "(konu yok)"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(m.created_at)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); toggleRead(m.id, !m.is_read); }}
                    >
                      {m.is_read ? "Okunmadı yap" : "Okundu işaretle"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeMessage(m.id); }}
                    >
                      Kalıcı olarak sil
                    </Button>
                  </div>
                </button>
                {isOpen && (
                  <div className="mt-3 whitespace-pre-wrap rounded bg-background p-3 text-sm">
                    {m.message}
                    <div className="mt-3">
                      <a className="text-primary underline" href={`mailto:${m.email}?subject=Re:%20${encodeURIComponent(m.subject || "İletişim")}`}>
                        E-posta ile yanıtla
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
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
  const fetchBundles = useServerFn(listAdminBundles);
  const upsertBundle = useServerFn(upsertAdminBundle);
  const createCoverUpload = useServerFn(createProductCoverUploadUrl);
  const createMasterUpload = useServerFn(createProductMasterUploadUrl);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [bundleData, setBundleData] = useState<{ bundles: any[]; products: any[] }>({ bundles: [], products: [] });
  const [bundleDrafts, setBundleDrafts] = useState<Record<string, any>>({});

  const reload = useCallback(async () => {
    const list = await fetchList();
    setRows(list);
    setDrafts({});
  }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);

  const reloadBundles = useCallback(async () => {
    const d = await fetchBundles();
    setBundleData(d);
    setBundleDrafts({});
  }, [fetchBundles]);
  useEffect(() => { reloadBundles(); }, [reloadBundles]);

  const bundlePriceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of bundleData.products) m[p.slug] = p.price_cents;
    return m;
  }, [bundleData.products]);

  const dirtyIds = useMemo(() => Object.keys(drafts).filter((id) => {
    const d = drafts[id]; const orig = rows.find((r) => r.id === id);
    if (!orig || !d) return false;
    return Object.keys(d).some((k) => (d[k] ?? null) !== (orig[k] ?? null));
  }), [drafts, rows]);
  const bundleDirtyIds = useMemo(() => Object.keys(bundleDrafts).filter((id) => {
    const d = bundleDrafts[id]; const orig = bundleData.bundles.find((r) => r.id === id);
    if (!orig || !d) return false;
    return Object.keys(d).some((k) => (d[k] ?? null) !== (orig[k] ?? null));
  }), [bundleDrafts, bundleData.bundles]);
  const dirtyCount = dirtyIds.length + bundleDirtyIds.length;
  const dirty = dirtyCount > 0;

  const patch = (id: string, k: string, v: any) => {
    setDrafts((prev) => {
      const orig = rows.find((r) => r.id === id);
      const base = prev[id] ?? { ...orig };
      return { ...prev, [id]: { ...base, [k]: v } };
    });
    setMsg(null);
  };

  const bundlePatch = (id: string, k: string, v: any) => {
    setBundleDrafts((prev) => {
      const orig = bundleData.bundles.find((r) => r.id === id);
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
        for (const k of ["name_tr","name_en","description_tr","description_en","price_cents","active","activate_at","cover_image_url","master_pdf_path","master_epub_path","language","book_key","category"]) {
          if ((d[k] ?? null) !== (orig?.[k] ?? null)) changed[k] = d[k];
        }
        await update({ data: changed });
      }
      for (const id of bundleDirtyIds) {
        const d = bundleDrafts[id]; const orig = bundleData.bundles.find((r) => r.id === id);
        const changed: any = { id };
        for (const k of ["active","activate_at","sort_order","price_override_cents","discount_percent","name_tr","description_tr"]) {
          if ((d[k] ?? null) !== (orig?.[k] ?? null)) changed[k] = d[k];
        }
        await upsertBundle({ data: changed });
      }
      if (dirtyIds.length) await reload();
      if (bundleDirtyIds.length) await reloadBundles();
      await queryClient.invalidateQueries({ queryKey: ["books-data"] });
      setMsg("Kaydedildi.");
      toast.success("Kaydedildi");
    } catch (e: any) {
      const m = e?.message ?? "bilinmiyor";
      setMsg("Hata: " + m);
      toast.error("Kaydetme hatası: " + m);
    } finally { setBusy(false); }
  };

  const currentValue = (p: any, k: string) => (drafts[p.id] ? drafts[p.id][k] : p[k]);
  const bundleValue = (b: any, k: string) => (bundleDrafts[b.id] ? bundleDrafts[b.id][k] : b[k]);

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

  const renderForm = (p: any) => {
    const isBook = p.type === "ebook";
    return (
      <div className="border-t border-border bg-muted/20 px-3 py-4">
        <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Kategori</Label>
                <Select value={currentValue(p, "category") ?? "diger"} onValueChange={(v) => patch(p.id, "category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden md:block" />
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
                <PriceInput
                  cents={currentValue(p, "price_cents") ?? 0}
                  onCommit={(cents) => patch(p.id, "price_cents", cents)}
                />
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
                    <div className="text-xs tracking-widest text-muted-foreground">KİTAP DOSYALARI</div>
                  </div>
                  <div>
                    <Label>Kapak görseli</Label>
                    <div className="mt-1 flex items-center gap-3">
                      {currentValue(p, "cover_image_url") && <img src={currentValue(p, "cover_image_url")} alt="kapak" className="h-20 w-auto rounded border border-border" />}
                      <input type="file" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(p, f); }} />
                      <MediaPickerButton onPick={(m) => patch(p.id, "cover_image_url", m.public_url)} />
                    </div>
                    <div className="mt-2">
                      <Input placeholder="veya dış URL" value={currentValue(p, "cover_image_url") ?? ""} onChange={(e) => patch(p.id, "cover_image_url", e.target.value)} />
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
      </div>
    );
  };

  const grouped = useMemo(() => {
    return PRODUCT_CATEGORIES.map((c) => ({
      ...c,
      items: rows
        .filter((r) => (r.category ?? "diger") === c.value)
        .slice()
        .sort((a, b) => String(a.name_tr ?? "").localeCompare(String(b.name_tr ?? ""), "tr")),
    })).filter((g) => g.items.length > 0);
  }, [rows]);

  const renderBundleForm = (b: any) => {
    const auto = resolveBundlePrice(
      { ...b, price_override_cents: null },
      bundlePriceMap,
      b.book_key === "hcd" ? "en" : "tr",
    );
    const override = bundleValue(b, "price_override_cents");
    return (
      <div className="border-t border-border bg-muted/20 px-3 py-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Ad (TR)</Label>
            <Input value={bundleValue(b, "name_tr") ?? ""} onChange={(e) => bundlePatch(b.id, "name_tr", e.target.value)} />
          </div>
          <div>
            <Label>Sıralama</Label>
            <Input type="number" value={bundleValue(b, "sort_order") ?? 0} onChange={(e) => bundlePatch(b.id, "sort_order", parseInt(e.target.value) || 0)} />
          </div>
          <div className="md:col-span-2">
            <Label>Açıklama (TR)</Label>
            <Textarea value={bundleValue(b, "description_tr") ?? ""} onChange={(e) => bundlePatch(b.id, "description_tr", e.target.value)} />
          </div>
          <div>
            <Label>Otomatik hesaplanan fiyat</Label>
            <div className="mt-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{fmtUsd(auto)}</div>
          </div>
          <div>
            <Label>Fiyat (override) — boşsa otomatik</Label>
            <PriceInput
              cents={override}
              nullable
              placeholder="Otomatik"
              onCommit={(cents) => bundlePatch(b.id, "price_override_cents", cents)}
            />
          </div>
          <div>
            <Label>İndirim (%)</Label>
            <Input type="number" value={bundleValue(b, "discount_percent") ?? 0} onChange={(e) => bundlePatch(b.id, "discount_percent", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Yayına giriş</Label>
            <Input type="datetime-local" value={bundleValue(b, "activate_at") ? new Date(bundleValue(b, "activate_at")).toISOString().slice(0,16) : ""}
              onChange={(e) => bundlePatch(b.id, "activate_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={!!bundleValue(b, "active")} onCheckedChange={(v) => bundlePatch(b.id, "active", v)} />
            <span className="text-sm">{bundleValue(b, "active") ? "Aktif" : "Pasif"} — {b.slug}</span>
          </div>
          <div className="md:col-span-2 text-xs text-muted-foreground">
            Bileşenler: {b.items.map((i: any) => `${i.product_slug}×${i.quantity}`).join(", ") || "—"}
            {b.includes_book && ` + kitap (${b.book_key})`}
          </div>
        </div>
      </div>
    );
  };

  const bundleRows = useMemo(
    () => bundleData.bundles.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [bundleData.bundles],
  );

  // Filtre çubuğu: kategori başına adet; "paket" sayımına paketler bölümü de dahil.
  const filterChips = useMemo(() => {
    const total = rows.length + bundleRows.length;
    const chips = PRODUCT_CATEGORIES.map((c) => ({
      value: c.value as string,
      label: c.label as string,
      count:
        rows.filter((r) => (r.category ?? "diger") === c.value).length +
        (c.value === "paket" ? bundleRows.length : 0),
    })).filter((c) => c.count > 0);
    return [{ value: "all", label: "Tümü", count: total }, ...chips];
  }, [rows, bundleRows]);

  const visibleGrouped = useMemo(
    () => (catFilter === "all" ? grouped : grouped.filter((g) => g.value === catFilter)),
    [grouped, catFilter],
  );
  const showBundles = bundleRows.length > 0 && (catFilter === "all" || catFilter === "paket");

  // Filtre değişince görünmeyen satır açık kalmasın.
  useEffect(() => {
    if (!openId) return;
    const visibleIds = new Set<string>([
      ...visibleGrouped.flatMap((g) => g.items.map((p: any) => p.id as string)),
      ...(showBundles ? bundleRows.map((b: any) => b.id as string) : []),
    ]);
    if (!visibleIds.has(openId)) setOpenId(null);
  }, [openId, visibleGrouped, showBundles, bundleRows]);

  return (
    <div className="space-y-6 pb-24">
      {filterChips.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {filterChips.map((c) => {
            const on = catFilter === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={on}
                onClick={() => setCatFilter(c.value)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {c.label} <span className="opacity-60">({c.count})</span>
              </button>
            );
          })}
        </div>
      )}
      {visibleGrouped.map((g) => (
        <section key={g.value}>
          <h3 className="mb-1 text-xs font-medium tracking-widest text-muted-foreground">
            {g.label.toLocaleUpperCase("tr-TR")} <span className="text-muted-foreground/60">({g.items.length})</span>
          </h3>
          <div className="overflow-hidden rounded-md border border-border">
            {g.items.map((p, i) => {
              const open = openId === p.id;
              const live = isLive({ active: !!currentValue(p, "active"), activate_at: currentValue(p, "activate_at") });
              const status = !currentValue(p, "active") ? "pasif" : live ? "live" : "taslak";
              return (
                <div key={p.id} className={i > 0 ? "border-t border-border" : undefined}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : p.id)}
                    className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{currentValue(p, "name_tr")}</span>
                    <span className="hidden truncate font-mono text-xs text-muted-foreground sm:block sm:w-56">{p.slug}</span>
                    <span className="w-24 shrink-0 text-right tabular-nums">
                      {((currentValue(p, "price_cents") ?? 0) / 100).toFixed(2)} {p.currency ?? "USD"}
                    </span>
                    <span
                      className={`w-16 shrink-0 text-center text-[11px] tracking-wide ${
                        status === "live" ? "text-accent" : status === "taslak" ? "text-muted-foreground" : "text-destructive"
                      }`}
                    >
                      {status.toLocaleUpperCase("tr-TR")}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && renderForm(p)}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {showBundles && (
        <section>
          <h3 className="mb-1 text-xs font-medium tracking-widest text-muted-foreground">
            PAKETLER <span className="text-muted-foreground/60">({bundleRows.length})</span>
          </h3>
          <div className="overflow-hidden rounded-md border border-border">
            {bundleRows.map((b, i) => {
              const open = openId === b.id;
              const live = isLive({ active: !!bundleValue(b, "active"), activate_at: bundleValue(b, "activate_at") });
              const status = !bundleValue(b, "active") ? "pasif" : live ? "live" : "taslak";
              const price = resolveBundlePrice(
                { ...b, price_override_cents: bundleValue(b, "price_override_cents"), discount_percent: bundleValue(b, "discount_percent") },
                bundlePriceMap,
                b.book_key === "hcd" ? "en" : "tr",
              );
              return (
                <div key={b.id} className={i > 0 ? "border-t border-border" : undefined}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : b.id)}
                    className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{bundleValue(b, "name_tr")}</span>
                    <span className="hidden truncate font-mono text-xs text-muted-foreground sm:block sm:w-56">{b.slug}</span>
                    <span className="w-24 shrink-0 text-right tabular-nums">{((price ?? 0) / 100).toFixed(2)} USD</span>
                    <span
                      className={`w-16 shrink-0 text-center text-[11px] tracking-wide ${
                        status === "live" ? "text-accent" : status === "taslak" ? "text-muted-foreground" : "text-destructive"
                      }`}
                    >
                      {status.toLocaleUpperCase("tr-TR")}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && renderBundleForm(b)}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <StickySaveBar dirty={dirty} count={dirtyCount} busy={busy} msg={msg} onSave={saveAll} onReset={() => { setDrafts({}); setBundleDrafts({}); setMsg(null); }} />
    </div>
  );
}

const PRODUCT_CATEGORIES = [
  { value: "kitap", label: "Kitaplar" },
  { value: "olcme", label: "Ölçme Araçları" },
  { value: "seans", label: "Seans ve Webinar" },
  { value: "paket", label: "Paketler" },
  { value: "program", label: "Uygulayıcı Programı" },
  { value: "diger", label: "Diğer" },
] as const;

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

// Dolar cinsinden fiyat girişi. Kullanıcı yazarken serbestçe yazsın diye
// yerel string state tutar; yalnızca blur / Enter'da cents'e commit edilir.
// Bu yaklaşım, her keystroke'ta .toFixed(2) reformatının cursor'ı kilitleyerek
// alanı salt-okunur gibi göstermesini engeller.
function PriceInput({
  cents,
  onCommit,
  nullable = false,
  placeholder,
}: {
  cents: number | null | undefined;
  onCommit: (cents: number | null) => void;
  nullable?: boolean;
  placeholder?: string;
}) {
  const format = (c: number | null | undefined) =>
    c == null || Number.isNaN(c) ? "" : (c / 100).toFixed(2);
  const [text, setText] = useState<string>(() => format(cents));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(format(cents));
  }, [cents, focused]);

  const commit = () => {
    const v = text.trim();
    if (!v) {
      onCommit(nullable ? null : 0);
      setText(nullable ? "" : "0.00");
      return;
    }
    const n = parseFloat(v.replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      setText(format(cents));
      return;
    }
    const c = Math.round(n * 100);
    onCommit(c);
    setText((c / 100).toFixed(2));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder ?? "0.00"}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { (e.currentTarget as HTMLInputElement).blur(); }
      }}
    />
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
            <SelectItem value="google_play">Google Books</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>ASIN</Label><Input value={d.asin ?? ""} onChange={(e) => upd("asin", e.target.value || null)} /></div>
      <div><Label>Harici URL (Google Books vs.)</Label><Input value={d.external_url ?? ""} onChange={(e) => upd("external_url", e.target.value || null)} /></div>
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
  const fetchVersions = useServerFn(getInstrumentVersionState);
  const [versionState, setVersionState] = useState<any | null>(null);
  const reload = useCallback(() => {
    fetchList().then(setRows);
    fetchVersions().then(setVersionState).catch(() => setVersionState(null));
  }, [fetchList, fetchVersions]);
  useEffect(() => { reload(); }, [reload]);
  const locked = Boolean(versionState?.locked?.pfa);
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
        <Button
          className="ml-auto"
          disabled={locked}
          onClick={() => setEditing({ text_tr: "", level: 1, reverse_coded: false, is_mini: false, active: true, sort_order: 0 })}
        >
          Yeni Soru
        </Button>
      </div>
      <InstrumentVersionPanel instrument="pfa" state={versionState} onChanged={reload} />
      <InstrumentVersionExplorer />
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
              <TableCell>
                <Button size="sm" variant="outline" disabled={locked} onClick={() => setEditing(q)}>
                  Düzenle
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function QuestionForm({ initial, onSave, onCancel }: { initial: any; onSave: (d: any) => void; onCancel: () => void }) {
  return <QuestionFormInner initial={initial} onSave={onSave} onCancel={onCancel} />;
}

function InstrumentVersionPanel({
  instrument,
  state,
  onChanged,
}: {
  instrument: "pfa" | "sevenq";
  state: any | null;
  onChanged: () => void;
}) {
  const bump = useServerFn(bumpInstrumentVersion);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const versions = (state.versions ?? []).filter((v: any) => v.instrument === instrument);
  const current = versions.find((v: any) => v.is_current);
  const locked = Boolean(state.locked?.[instrument]);

  const createVersion = async () => {
    if (!window.confirm("Yeni bir ölçek sürümü oluşturulacak ve mevcut madde havuzu bu sürüme dondurulacak. Devam edilsin mi?")) return;
    setBusy(true);
    try {
      const r = await bump({ data: { instrument, label: label || null, notes: notes || null } });
      toast.success(`Sürüm v${r.version} oluşturuldu`);
      setLabel("");
      setNotes("");
      setOpen(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Sürüm oluşturulamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Ölçek Sürümü">
      <div className="space-y-3 text-sm">
        <div>
          Geçerli sürüm: <strong>v{current?.version ?? 1}</strong>
          {current?.label ? <span className="text-muted-foreground"> — {current.label}</span> : null}
        </div>
        {locked ? (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <strong>Bu sürüm kilitli.</strong> v{current?.version} ile yanıt toplanmış olduğu için madde
            metni, seviyesi, ters kodlaması veya aktifliği değiştirilemez. Değişiklik yapmak için önce
            yeni bir sürüm oluşturun; eski yanıtlar kendi sürümünün madde metinleriyle birlikte saklı kalır.
          </div>
        ) : (
          <div className="text-muted-foreground">
            Bu sürümde henüz yanıt yok; düzenlemeler sürüm kopyasına otomatik yansır.
          </div>
        )}
        <div>
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? "Kapat" : "Yeni sürüm oluştur"}
          </Button>
        </div>
        {open && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <div>
              <Label>Etiket</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="v2 — pilot sonrası kısaltma" />
            </div>
            <div>
              <Label>Not</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Neyin değiştiğini yazın" />
            </div>
            <Button size="sm" onClick={createVersion} disabled={busy}>
              {busy ? "Oluşturuluyor…" : "Sürümü oluştur ve havuzu dondur"}
            </Button>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Sürüm geçmişi: {versions.map((v: any) => `v${v.version}`).join(" · ") || "—"}
        </div>
      </div>
    </Card>
  );
}

function InstrumentVersionExplorer() {
  const fetchInventory = useServerFn(getInstrumentVersionInventory);
  const fetchDiff = useServerFn(diffInstrumentVersions);
  const [rows, setRows] = useState<any[] | null>(null);
  const [instrument, setInstrument] = useState<"pfa" | "sevenq">("pfa");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [diff, setDiff] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchInventory().then((r) => setRows(r.versions as any[])).catch(() => setRows([]));
  }, [fetchInventory]);

  const list = useMemo(
    () => (rows ?? []).filter((v) => v.instrument === instrument),
    [rows, instrument],
  );

  const runDiff = async () => {
    if (!from || !to) return;
    setBusy(true);
    try {
      setDiff(await fetchDiff({ data: { instrument, from: Number(from), to: Number(to) } }));
    } catch (e: any) {
      toast.error(e?.message ?? "Karşılaştırma yapılamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Sürüm İzleme ve Karşılaştırma">
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-3">
          <Label>Ölçek</Label>
          <Select value={instrument} onValueChange={(v) => { setInstrument(v as "pfa" | "sevenq"); setDiff(null); setFrom(""); setTo(""); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pfa">PFA Ölçeği</SelectItem>
              <SelectItem value="sevenq">7Q Profili</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rows === null ? (
          <div className="text-muted-foreground">Yükleniyor…</div>
        ) : list.length === 0 ? (
          <div className="text-muted-foreground">Bu ölçek için kayıtlı sürüm yok.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Sürüm</TableHead><TableHead>Etiket</TableHead><TableHead>Oluşturma</TableHead>
              <TableHead>Madde</TableHead><TableHead>Oturum</TableHead><TableHead>Durum</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((v) => (
                <TableRow key={`${v.instrument}-${v.version}`}>
                  <TableCell>v{v.version}</TableCell>
                  <TableCell className="text-xs">{v.label ?? "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(v.created_at).toLocaleDateString("tr-TR")}</TableCell>
                  <TableCell>{v.item_count}</TableCell>
                  <TableCell>{v.session_count}</TableCell>
                  <TableCell className="text-xs">{v.is_current ? "Geçerli" : "Arşiv"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {list.length >= 2 && (
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
            <div>
              <Label>Kaynak sürüm</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="w-32"><SelectValue placeholder="v?" /></SelectTrigger>
                <SelectContent>
                  {list.map((v) => (<SelectItem key={`f${v.version}`} value={String(v.version)}>v{v.version}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hedef sürüm</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger className="w-32"><SelectValue placeholder="v?" /></SelectTrigger>
                <SelectContent>
                  {list.map((v) => (<SelectItem key={`t${v.version}`} value={String(v.version)}>v{v.version}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" disabled={busy || !from || !to} onClick={runDiff}>
              {busy ? "Karşılaştırılıyor…" : "Karşılaştır"}
            </Button>
          </div>
        )}

        {diff && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              v{diff.from} ({diff.counts.from} madde) → v{diff.to} ({diff.counts.to} madde) ·
              {" "}Eklenen: {diff.added.length} · Çıkarılan: {diff.removed.length} · Değişen: {diff.changed.length}
            </div>
            <DiffList title="Eklenen maddeler" items={diff.added} />
            <DiffList title="Çıkarılan maddeler" items={diff.removed} />
            <DiffList title="Değişen maddeler" items={diff.changed} showChanges />
          </div>
        )}
      </div>
    </Card>
  );
}

const DIFF_FIELD_LABELS: Record<string, string> = {
  text_tr: "Metin",
  level: "Seviye",
  capacity: "Kapasite",
  reverse_coded: "Ters kodlama",
  is_pilot_only: "Pilot maddesi",
  active: "Aktif",
};

function DiffList({ title, items, showChanges }: { title: string; items: any[]; showChanges?: boolean }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 text-xs font-medium">{title} ({items.length})</div>
      <ul className="space-y-2 text-xs">
        {items.map((it, i) => (
          <li key={`${it.item_code ?? i}`}>
            <span className="font-mono">{it.item_code ?? "—"}</span> — {it.text_tr ?? ""}
            {showChanges && (
              <ul className="mt-1 space-y-0.5 pl-4 text-muted-foreground">
                {it.changes.map((c: any, j: number) => (
                  <li key={j}>
                    {DIFF_FIELD_LABELS[c.field] ?? c.field}: “{c.from}” → “{c.to}”
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionFormInner({ initial, onSave, onCancel }: { initial: any; onSave: (d: any) => void; onCancel: () => void }) {
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
  const [err, setErr] = useState<string | null>(null);
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
        <Button onClick={() => { setErr(null); setEditing({ product_id: data.products[0]?.id ?? "", title: "", starts_at: new Date().toISOString().slice(0,16), capacity: null, join_url: "", notes: "", banner_url: "", price_cents: data.products[0]?.price_cents ?? 0 }); }}>Yeni Oturum</Button>
      </div>
      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Kaydedilemedi: {err}
        </div>
      )}
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
            onSave={async (d) => {
              setErr(null);
              await save({ data: d });
              setEditing(null);
              reload();
            }}
          />
        </Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Başlık</TableHead><TableHead>Ürün</TableHead><TableHead>Tarih</TableHead><TableHead>Ücret</TableHead><TableHead>Kapasite</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {data.sessions.map((s) => {
            const p = data.products.find((x) => x.id === s.product_id);
            return (
              <TableRow key={s.id}>
                <TableCell>{s.title}</TableCell><TableCell>{p?.name_tr ?? "—"}</TableCell><TableCell>{fmtDate(s.starts_at)}</TableCell><TableCell>{formatWebinarPrice(p?.price_cents)}</TableCell><TableCell>{s.capacity ?? "—"}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setErr(null); setEditing({ ...s, starts_at: new Date(s.starts_at).toISOString().slice(0,16), price_cents: p?.price_cents ?? 0 }); }}>Düzenle</Button>
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

function WebinarForm({ initial, products, onSave, onCancel }: { initial: any; products: any[]; onSave: (d: any) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
  const priceInput = d.price_cents == null ? "" : String(d.price_cents / 100);

  const submit = async () => {
    setError(null);
    if (!d.product_id) { setError("Ürün seçilmedi."); return; }
    if (!d.title?.trim()) { setError("Başlık boş bırakılamaz."); return; }
    if (!d.starts_at || Number.isNaN(new Date(d.starts_at).getTime())) {
      setError("Tarih ve saat geçersiz."); return;
    }
    setBusy(true);
    try {
      await onSave({
        ...(d.id ? { id: d.id } : {}),
        product_id: d.product_id,
        title: d.title.trim(),
        starts_at: new Date(d.starts_at).toISOString(),
        capacity: d.capacity || null,
        join_url: d.join_url?.trim() || null,
        notes: d.notes?.trim() || null,
        banner_url: d.banner_url?.trim() || null,
        price_cents: d.price_cents == null ? 0 : d.price_cents,
      });
    } catch (e: any) {
      setError(e?.message ?? "Bilinmeyen hata.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div><Label>Ürün</Label>
        <Select value={d.product_id} onValueChange={(v) => {
          const p = products.find((x) => x.id === v);
          setD({ ...d, product_id: v, price_cents: p?.price_cents ?? 0 });
        }}>
          <SelectTrigger><SelectValue placeholder="Ürün seçin" /></SelectTrigger>
          <SelectContent>{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name_tr}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div><Label>Başlık</Label><Input value={d.title ?? ""} onChange={(e) => upd("title", e.target.value)} /></div>
      <div><Label>Tarih & Saat</Label><Input type="datetime-local" value={d.starts_at ?? ""} onChange={(e) => upd("starts_at", e.target.value)} /></div>
      <div><Label>Kapasite</Label><Input type="number" value={d.capacity ?? ""} onChange={(e) => upd("capacity", e.target.value ? parseInt(e.target.value) : null)} /></div>
      <div>
        <Label>Ücret (USD)</Label>
        <Input
          type="number"
          min={0}
          step="1"
          placeholder="0"
          value={priceInput}
          onChange={(e) => upd("price_cents", e.target.value === "" ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) * 100)))}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Ürün fiyatına yazılır (tek kaynak). {formatWebinarPrice(d.price_cents) === FREE_LABEL_TR ? `0 veya boş → sitede "${FREE_LABEL_TR}" görünür.` : `Sitede ${formatWebinarPrice(d.price_cents)} görünür.`}
        </p>
      </div>
      <div className="md:col-span-2"><Label>Katılım linki</Label><Input placeholder="https://…" value={d.join_url ?? ""} onChange={(e) => upd("join_url", e.target.value)} /></div>
      <div className="md:col-span-2"><Label>Notlar</Label><Textarea rows={4} value={d.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} /></div>
      <div className="md:col-span-2">
        <Label>Webinar Görseli</Label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {d.banner_url
            ? <img src={d.banner_url} alt="Webinar görseli" className="h-20 w-auto rounded border border-border" />
            : <div className="flex h-20 w-32 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">Görsel yok</div>}
          <MediaPickerButton label={d.banner_url ? "Görseli Değiştir" : "Kütüphaneden Seç"} onPick={(m) => upd("banner_url", m.public_url)} />
          {d.banner_url && (
            <Button type="button" size="sm" variant="outline" onClick={() => upd("banner_url", "")}>Görseli Kaldır</Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Görsel formun bir parçası; oturumla birlikte tek kaydetmede saklanır.
        </p>
      </div>
      {error && (
        <div className="md:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex gap-2 md:col-span-2">
        <Button onClick={submit} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
        <Button variant="outline" onClick={onCancel} disabled={busy}>İptal</Button>
      </div>
      {d.title && d.starts_at && !Number.isNaN(new Date(d.starts_at).getTime()) && (
        <div className="md:col-span-2">
          <WebinarShareDrafts session={d} products={products} />
        </div>
      )}
    </div>
  );
}

// ============== SHARE KIT ==============
function webinarPublicUrl(products: any[], productId: string): string {
  const slug = products.find((p) => p.id === productId)?.slug ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://psychofunctionalanalysis.com";
  const path = slug === "pfa-pro-lisans-paketi" ? "/webinarlar/pfa-pro"
    : slug === "bilinc-seviyeleri-calismalari" ? "/webinarlar/bilinc-seviyeleri"
    : "/webinarlar";
  return `${origin}${path}`;
}

function CopyRow({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Kopyalandı ✓" : label}
    </Button>
  );
}

async function downloadFromUrl(url: string, filename: string) {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    const objectUrl = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function WebinarShareDrafts({ session, products }: { session: any; products: any[] }) {
  const url = webinarPublicUrl(products, session.product_id);
  const drafts = useMemo(
    () =>
      buildWebinarDrafts({
        title: session.title,
        startsAt: new Date(session.starts_at).toISOString(),
        priceCents: session.price_cents,
        notes: session.notes,
        url,
      }),
    [session.title, session.starts_at, session.price_cents, session.notes, url],
  );
  const [texts, setTexts] = useState(drafts);
  useEffect(() => { setTexts(drafts); }, [drafts]);
  const upd = (k: keyof typeof texts, v: string) => setTexts({ ...texts, [k]: v });

  return (
    <Card title="Paylaşım metinleri">
      <p className="mb-4 text-xs text-muted-foreground">
        Metinler bu formdaki alanlardan üretilir; düzenleyip kopyalayabilirsiniz.
      </p>
      <div className="space-y-5">
        <div>
          <Label>LinkedIn</Label>
          <Textarea rows={7} value={texts.linkedin} onChange={(e) => upd("linkedin", e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyRow value={texts.linkedin} label="Metni Kopyala" />
            <a className="btn-primary hover:btn-primary-hover rounded-md px-3 py-1.5 text-sm" href={shareLinks(texts.linkedin, url).linkedin} target="_blank" rel="noreferrer">LinkedIn'de paylaş</a>
          </div>
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Textarea rows={4} value={texts.whatsapp} onChange={(e) => upd("whatsapp", e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyRow value={texts.whatsapp} label="Metni Kopyala" />
            <a className="btn-primary hover:btn-primary-hover rounded-md px-3 py-1.5 text-sm" href={shareLinks(texts.whatsapp, url).whatsapp} target="_blank" rel="noreferrer">WhatsApp'ta paylaş</a>
          </div>
        </div>
        <div>
          <Label>Instagram</Label>
          <Textarea rows={7} value={texts.instagram} onChange={(e) => upd("instagram", e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CopyRow value={texts.instagram} label="Başlığı Kopyala" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!session.banner_url}
              onClick={() => downloadFromUrl(session.banner_url, `webinar-${(session.title ?? "gorsel").slice(0, 40)}.jpg`)}
            >
              Görseli İndir
            </Button>
            <span className="text-xs text-muted-foreground">
              Instagram için hazırla: başlığı kopyalayın, görseli indirin, uygulamadan paylaşın.
            </span>
          </div>
          {!session.banner_url && (
            <p className="mt-1 text-xs text-muted-foreground">Görsel seçilmedi — indirme kapalı.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ShareKitModal({ session, onClose }: { session: any; onClose: () => void }) {
  const products = session.product ? [session.product] : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-primary">Paylaşım Kiti</h3>
          <Button size="sm" variant="outline" onClick={onClose}>Kapat</Button>
        </div>
        {session.banner_url && (
          <img src={session.banner_url} alt="Webinar görseli" className="mb-4 max-h-56 w-auto rounded border border-border" />
        )}
        <WebinarShareDrafts
          session={{ ...session, price_cents: session.product?.price_cents ?? null }}
          products={products}
        />
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
      const out: Record<string, string> = { social_instagram: "", social_linkedin: "", social_x: "", social_youtube: "", podcast_program_url: "", admin_notification_email: "" };
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
    <div className="space-y-6">
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
    <Card title="Bildirim E-postası">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Yönetici Bildirim E-postası</Label>
          <Input
            type="email"
            placeholder="corteqssocial@gmail.com"
            value={rows.admin_notification_email ?? ""}
            onChange={(e) => upd("admin_notification_email", e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Yeni sipariş, başvuru ve iletişim mesajları bu adrese iletilir.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={submit} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
      </div>
    </Card>
    </div>
  );
}

// ============== BLOG ==============
function BlogTab() {
  const fetchList = useServerFn(listAdminPosts);
  const save = useServerFn(upsertPost);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [ig, setIg] = useState<{ post: any; lang: "tr" | "en" } | null>(null);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="space-y-4">
      {ig && <InstagramPrepModal post={ig.post} lang={ig.lang} onClose={() => setIg(null)} />}
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
              <TableCell className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Düzenle</Button>
                <Button size="sm" variant="outline" onClick={() => setIg({ post: p, lang: "tr" })}>Instagram TR</Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasEnglish(p)}
                  title={hasEnglish(p) ? "İngilizce içerikten başlık üret" : "İngilizce içerik girilmedi"}
                  onClick={() => setIg({ post: p, lang: "en" })}
                >
                  Instagram GLB
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function hasEnglish(p: any): boolean {
  return Boolean((p.title_en ?? "").trim() && (p.content_en ?? "").trim());
}

function InstagramPrepModal({ post, lang, onClose }: { post: any; lang: "tr" | "en"; onClose: () => void }) {
  const url = `https://psychofunctionalanalysis.com/blog/${post.slug}`;
  const image = (lang === "en" ? post.cover_image_url_en : null) ?? post.cover_image_url ?? "";
  const caption = useMemo(() => {
    const input = lang === "en"
      ? { title: post.title_en, opening: openingLine(post.seo_description_en || post.content_en), url }
      : { title: post.title, opening: openingLine(post.seo_description || post.content), url };
    return lang === "en" ? buildInstagramCaptionEn(input) : buildInstagramCaptionTr(input);
  }, [post, lang, url]);
  const [text, setText] = useState(caption);
  useEffect(() => { setText(caption); }, [caption]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-primary">
            Instagram için hazırla — {lang === "en" ? "GLB (EN)" : "TR"}
          </h3>
          <Button size="sm" variant="outline" onClick={onClose}>Kapat</Button>
        </div>
        {image && <img src={image} alt="" className="mb-4 max-h-56 w-auto rounded border border-border" />}
        <Label>Başlık (caption)</Label>
        <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyRow value={text} label="Başlığı Kopyala" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!image}
            onClick={() => downloadFromUrl(image, `${post.slug}-instagram.jpg`)}
          >
            Görseli İndir
          </Button>
          <CopyRow value={url} label="Linki Kopyala" />
        </div>
        {!image && <p className="mt-2 text-xs text-muted-foreground">Kapak görseli yok — indirme kapalı.</p>}
      </div>
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
        <div className="md:col-span-2">
          <Label>Kapak görseli URL</Label>
          <div className="flex items-center gap-2">
            <Input value={d.cover_image_url ?? ""} onChange={(e) => upd("cover_image_url", e.target.value)} />
            <MediaPickerButton onPick={(m) => upd("cover_image_url", m.public_url)} />
          </div>
        </div>
        <div className="md:col-span-2 rounded-md border border-border/70 p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">İngilizce (GLB) — opsiyonel</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div><Label>Title (EN)</Label><Input value={d.title_en ?? ""} onChange={(e) => upd("title_en", e.target.value)} /></div>
            <div><Label>SEO description (EN)</Label><Input value={d.seo_description_en ?? ""} onChange={(e) => upd("seo_description_en", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Content (EN)</Label><Textarea rows={6} value={d.content_en ?? ""} onChange={(e) => upd("content_en", e.target.value)} /></div>
            <div className="md:col-span-2">
              <Label>Cover image URL (EN)</Label>
              <div className="flex items-center gap-2">
                <Input value={d.cover_image_url_en ?? ""} onChange={(e) => upd("cover_image_url_en", e.target.value)} />
                <MediaPickerButton onPick={(m) => upd("cover_image_url_en", m.public_url)} />
              </div>
            </div>
          </div>
        </div>
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

// -------- PRO HESAPLAR --------
// MAHREMİYET: Ölçek cevap/sonuç içeriği bu ekranda ASLA gösterilmez;
// yalnızca sayısal alanlar (davet sayıları, kredi kotası) gösterilir.
function ProAccountsTab() {
  const fetchList = useServerFn(listProAccounts);
  const fetchInvites = useServerFn(listProInvitesForAdmin);
  const searchProfiles = useServerFn(searchProfilesForPro);
  const doGrant = useServerFn(grantProAccount);
  const doRevoke = useServerFn(revokeProAccount);
  const doAddCredits = useServerFn(addProCredits);

  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [invites, setInvites] = useState<Record<string, any[]>>({});

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantQ, setGrantQ] = useState("");
  const [grantResults, setGrantResults] = useState<any[]>([]);
  const [grantSelected, setGrantSelected] = useState<any | null>(null);
  const [grantConfirm, setGrantConfirm] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [creditsTarget, setCreditsTarget] = useState<any | null>(null);
  const [creditsAmount, setCreditsAmount] = useState<string>("10");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchList({ data: { q: term || undefined, page, pageSize } });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e?.message ?? "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [fetchList, term, page]);

  useEffect(() => { reload(); }, [reload]);

  const toggleExpand = async (uid: string) => {
    if (expanded === uid) { setExpanded(null); return; }
    setExpanded(uid);
    if (!invites[uid]) {
      try {
        const inv = await fetchInvites({ data: { pro_user_id: uid } });
        setInvites((s) => ({ ...s, [uid]: inv }));
      } catch (e: any) {
        toast.error(e?.message ?? "Davetler yüklenemedi");
      }
    }
  };

  const runSearch = async () => {
    const v = grantQ.trim();
    if (v.length < 2) { setGrantResults([]); return; }
    try {
      const r = await searchProfiles({ data: { q: v } });
      setGrantResults(r as any[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Arama başarısız");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalCredits = rows.reduce((s, r) => s + r.quota, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-sm"
          placeholder="Ad veya e-posta ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); setTerm(q); } }}
        />
        <Button variant="secondary" onClick={() => { setPage(0); setTerm(q); }}>Ara</Button>
        {term && (
          <Button variant="ghost" onClick={() => { setQ(""); setTerm(""); setPage(0); }}>
            Temizle
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => { setGrantOpen(true); setGrantQ(""); setGrantResults([]); setGrantSelected(null); }}>
            Pro Yetkisi Ver
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Toplam {total} Pro hesap · Bu sayfada {totalUsed}/{totalCredits} kredi kullanıldı.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Verilme</TableHead>
            <TableHead>Kaynak</TableHead>
            <TableHead>Davet (Beklyn/Tmml)</TableHead>
            <TableHead>Tmml. Ölçek</TableHead>
            <TableHead>Kalan Kredi</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground">Yükleniyor…</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground">Kayıt yok.</TableCell></TableRow>
          ) : rows.map((r) => (
            <>
              <TableRow key={r.entitlement_id}>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(r.user_id)}>
                    {expanded === r.user_id ? "▾" : "▸"}
                  </Button>
                </TableCell>
                <TableCell className="text-xs">{r.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                <TableCell className="text-xs">{fmtDate(r.granted_at)}</TableCell>
                <TableCell className="text-xs">
                  {r.source === "purchase" ? "Satın alma" : "Manuel"}
                </TableCell>
                <TableCell className="text-xs">{r.invites_pending} / {r.invites_completed}</TableCell>
                <TableCell className="text-xs">{r.invites_completed}</TableCell>
                <TableCell className="text-xs">
                  {r.remaining} <span className="text-muted-foreground">/ {r.quota}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { setCreditsTarget(r); setCreditsAmount("10"); }}>
                      Kredi Ekle
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRevokeTarget(r)}>
                      Kaldır
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expanded === r.user_id && (
                <TableRow key={r.entitlement_id + "-exp"}>
                  <TableCell colSpan={9} className="bg-muted/30">
                    <div className="p-3">
                      <div className="mb-2 text-xs font-medium">
                        Davetler ({(invites[r.user_id] ?? []).length}) — salt okunur
                      </div>
                      {(invites[r.user_id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {invites[r.user_id] ? "Bu Pro henüz davet oluşturmadı." : "Yükleniyor…"}
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Danışan</TableHead>
                              <TableHead>Durum</TableHead>
                              <TableHead>Oluşturulma</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(invites[r.user_id] ?? []).map((inv: any) => (
                              <TableRow key={inv.id}>
                                <TableCell className="text-xs">{inv.client_name}</TableCell>
                                <TableCell className="text-xs">{inv.status}</TableCell>
                                <TableCell className="text-xs">{fmtDate(inv.created_at)}</TableCell>
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

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Sayfa {page + 1} / {totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Önceki
          </Button>
          <Button size="sm" variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Sonraki
          </Button>
        </div>
      </div>

      {/* --- GRANT PRO --- */}
      <AlertDialog open={grantOpen} onOpenChange={setGrantOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Pro Yetkisi Ver</AlertDialogTitle>
            <AlertDialogDescription>
              E-posta veya ad ile kullanıcı arayın, ardından seçip onaylayın.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="ornek@mail.com veya ad soyad"
                value={grantQ}
                onChange={(e) => setGrantQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              />
              <Button variant="secondary" onClick={runSearch}>Ara</Button>
            </div>
            <div className="max-h-56 space-y-1 overflow-auto rounded border">
              {grantResults.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">Sonuç yok.</p>
              ) : grantResults.map((p) => (
                <button
                  key={p.id}
                  disabled={p.is_pro}
                  onClick={() => { setGrantSelected(p); setGrantConfirm(true); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50 ${grantSelected?.id === p.id ? "bg-muted" : ""}`}
                >
                  <div>
                    <div className="font-medium">{p.full_name || "—"}</div>
                    <div className="text-muted-foreground">{p.email}</div>
                  </div>
                  {p.is_pro && <span className="text-accent">Zaten Pro</span>}
                </button>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Kapat</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- GRANT CONFIRM --- */}
      <AlertDialog open={grantConfirm} onOpenChange={setGrantConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pro yetkisi verilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {grantSelected?.email} kullanıcısına PFA-Pro lisansı ve 20 danışan kredisi verilecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!grantSelected) return;
                try {
                  await doGrant({ data: { user_id: grantSelected.id, initial_quota: 20 } });
                  toast.success("Pro yetkisi verildi");
                  setGrantConfirm(false);
                  setGrantOpen(false);
                  setGrantSelected(null);
                  reload();
                } catch (e: any) {
                  if (e?.message === "ALREADY_PRO") {
                    toast.error("Bu kullanıcı zaten Pro");
                  } else {
                    toast.error(e?.message ?? "İşlem başarısız");
                  }
                }
              }}
            >Onayla</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- REVOKE --- */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pro yetkisini kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kullanıcının Pro erişimi kapanacak. {revokeTarget?.email}
              <br />Mevcut davet ve danışan kayıtları silinmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!revokeTarget) return;
                try {
                  await doRevoke({ data: { user_id: revokeTarget.user_id } });
                  toast.success("Pro yetkisi kaldırıldı");
                  setRevokeTarget(null);
                  reload();
                } catch (e: any) {
                  toast.error(e?.message ?? "İşlem başarısız");
                }
              }}
            >Onayla</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- ADD CREDITS --- */}
      <AlertDialog open={!!creditsTarget} onOpenChange={(o) => !o && setCreditsTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kredi Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              {creditsTarget?.email} kullanıcısının danışan kredisine eklenecek adet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label>Adet</Label>
            <Input
              type="number"
              min={1}
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!creditsTarget) return;
                const n = parseInt(creditsAmount, 10);
                if (!Number.isFinite(n) || n < 1) { toast.error("Geçersiz adet"); return; }
                try {
                  const r = await doAddCredits({ data: { user_id: creditsTarget.user_id, amount: n } });
                  toast.success(`${n} kredi eklendi. Yeni kota: ${(r as any).new_quota}`);
                  setCreditsTarget(null);
                  reload();
                } catch (e: any) {
                  toast.error(e?.message ?? "İşlem başarısız");
                }
              }}
            >Onayla</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============== PRACTITIONERS ==============
type PractitionerRow = {
  id: string;
  full_name: string;
  category: "terapotik" | "kocluk" | "pedagojik" | "kurumsal";
  title: string | null;
  photo_url: string | null;
  short_bio: string | null;
  long_bio: string | null;
  specializations: string[];
  languages: string[];
  city: string | null;
  country: string;
  mode: "online" | "yuz_yuze" | "her_ikisi";
  email: string | null;
  website: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
};

const P_CATEGORY_LABEL: Record<PractitionerRow["category"], string> = {
  terapotik: "Terapötik",
  kocluk: "Koçluk",
  pedagojik: "Pedagojik",
  kurumsal: "Kurumsal",
};
const P_MODE_LABEL: Record<PractitionerRow["mode"], string> = {
  online: "Online",
  yuz_yuze: "Yüz Yüze",
  her_ikisi: "Online / Yüz Yüze",
};

function emptyPractitioner(): Omit<PractitionerRow, "id" | "created_at"> & { id?: string } {
  return {
    full_name: "",
    category: "terapotik",
    title: "",
    photo_url: "",
    short_bio: "",
    long_bio: "",
    specializations: [],
    languages: [],
    city: "",
    country: "Türkiye",
    mode: "online",
    email: "",
    website: "",
    published: false,
    sort_order: 0,
  };
}

function PractitionersTab() {
  const [view, setView] = useState<"list" | "applications" | "inquiries">("list");
  const [seed, setSeed] = useState<
    (Omit<PractitionerRow, "id" | "created_at"> & { id?: string }) | null
  >(null);
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={view === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("list")}
        >
          Uygulayıcılar
        </Button>
        <Button
          variant={view === "applications" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("applications")}
        >
          Başvurular
        </Button>
        <Button
          variant={view === "inquiries" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("inquiries")}
        >
          Gelen Talepler
        </Button>
      </div>
      {view === "list" ? (
        <PractitionerList seed={seed} onSeedConsumed={() => setSeed(null)} />
      ) : view === "applications" ? (
        <PractitionerApplications />
      ) : (
        <PractitionerInquiries />
      )}
    </div>
  );
}

function PractitionerList({
  seed,
  onSeedConsumed,
}: {
  seed?: (Omit<PractitionerRow, "id" | "created_at"> & { id?: string }) | null;
  onSeedConsumed?: () => void;
}) {
  const list = useServerFn(listAdminPractitioners);
  const upsert = useServerFn(upsertAdminPractitioner);
  const del = useServerFn(deleteAdminPractitioner);
  const uploadUrl = useServerFn(createPractitionerPhotoUploadUrl);
  const [rows, setRows] = useState<PractitionerRow[]>([]);
  const [editing, setEditing] = useState<
    (Omit<PractitionerRow, "id" | "created_at"> & { id?: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    const r = await list();
    setRows((r ?? []) as PractitionerRow[]);
  }, [list]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Başvurudan ön doldurulmuş yeni kayıt formunu aç
  useEffect(() => {
    if (seed) {
      setEditing(seed);
      onSeedConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  async function togglePublished(row: PractitionerRow, next: boolean) {
    try {
      await upsert({
        data: {
          id: row.id,
          full_name: row.full_name,
          category: row.category,
          title: row.title,
          photo_url: row.photo_url,
          short_bio: row.short_bio,
          long_bio: row.long_bio,
          specializations: row.specializations ?? [],
          languages: row.languages ?? [],
          city: row.city,
          country: row.country ?? "Türkiye",
          mode: row.mode,
          email: row.email,
          website: row.website,
          published: next,
          sort_order: row.sort_order,
        },
      });
      toast.success(next ? "Yayına alındı" : "Gizlendi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    }
  }

  async function updateOrder(row: PractitionerRow, next: number) {
    try {
      await upsert({
        data: {
          id: row.id,
          full_name: row.full_name,
          category: row.category,
          title: row.title,
          photo_url: row.photo_url,
          short_bio: row.short_bio,
          long_bio: row.long_bio,
          specializations: row.specializations ?? [],
          languages: row.languages ?? [],
          city: row.city,
          country: row.country ?? "Türkiye",
          mode: row.mode,
          email: row.email,
          website: row.website,
          published: row.published,
          sort_order: next,
        },
      });
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.full_name.trim()) {
      toast.error("Ad zorunlu");
      return;
    }
    if ((editing.short_bio?.length ?? 0) > 300) {
      toast.error("Kısa bio en fazla 300 karakter olabilir");
      return;
    }
    setSaving(true);
    try {
      const cleanNullable = (s: string | null | undefined) =>
        s && s.trim().length > 0 ? s.trim() : null;
      await upsert({
        data: {
          id: editing.id,
          full_name: editing.full_name.trim(),
          category: editing.category,
          title: cleanNullable(editing.title),
          photo_url: cleanNullable(editing.photo_url),
          short_bio: cleanNullable(editing.short_bio),
          long_bio: cleanNullable(editing.long_bio),
          specializations: (editing.specializations ?? []).filter((s) => s.trim().length > 0),
          languages: (editing.languages ?? []).filter((s) => s.trim().length > 0),
          city: cleanNullable(editing.city),
          country: editing.country?.trim() || "Türkiye",
          mode: editing.mode,
          email: cleanNullable(editing.email),
          website: cleanNullable(editing.website),
          published: !!editing.published,
          sort_order: Number.isFinite(editing.sort_order) ? editing.sort_order : 0,
        },
      });
      toast.success("Kaydedildi");
      setEditing(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: PractitionerRow) {
    if (!confirm(`${row.full_name} silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await del({ data: { id: row.id } });
      toast.success("Silindi");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Silinemedi");
    }
  }

  async function handlePhotoFile(file: File) {
    if (!editing) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fotoğraf 5MB'dan büyük olamaz");
      return;
    }
    setUploading(true);
    try {
      const { path, token, publicUrl } = (await uploadUrl({
        data: { filename: file.name },
      })) as { path: string; token: string; publicUrl: string };
      const { error } = await supabase.storage
        .from("practitioner-photos")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      setEditing({ ...editing, photo_url: publicUrl });
      toast.success("Fotoğraf yüklendi");
    } catch (e: any) {
      toast.error(e?.message ?? "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} uygulayıcı — sıra numarası küçük olan üstte görünür.
        </p>
        <Button size="sm" onClick={() => setEditing(emptyPractitioner())}>
          + Yeni Uygulayıcı
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sıra</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead>Görüşme</TableHead>
              <TableHead>Yayında</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Input
                    type="number"
                    className="w-20"
                    defaultValue={r.sort_order}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n !== r.sort_order) updateOrder(r, n);
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell>{P_CATEGORY_LABEL[r.category]}</TableCell>
                <TableCell>{r.city ?? "—"}</TableCell>
                <TableCell>{P_MODE_LABEL[r.mode]}</TableCell>
                <TableCell>
                  <Switch
                    checked={r.published}
                    onCheckedChange={(v) => togglePublished(r, v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                    Düzenle
                  </Button>{" "}
                  <Button size="sm" variant="outline" onClick={() => handleDelete(r)}>
                    Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Henüz uygulayıcı yok. "Yeni Uygulayıcı" ile ekleyin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {editing && (
        <Card title={editing.id ? "Uygulayıcı Düzenle" : "Yeni Uygulayıcı"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Ad Soyad *</Label>
              <Input
                value={editing.full_name}
                onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Ünvan</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select
                value={editing.category}
                onValueChange={(v) => setEditing({ ...editing, category: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(P_CATEGORY_LABEL) as Array<keyof typeof P_CATEGORY_LABEL>).map(
                    (k) => (
                      <SelectItem key={k} value={k}>{P_CATEGORY_LABEL[k]}</SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Görüşme Şekli</Label>
              <Select
                value={editing.mode}
                onValueChange={(v) => setEditing({ ...editing, mode: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(P_MODE_LABEL) as Array<keyof typeof P_MODE_LABEL>).map((k) => (
                    <SelectItem key={k} value={k}>{P_MODE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Şehir</Label>
              <Input
                value={editing.city ?? ""}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
            </div>
            <div>
              <Label>Ülke</Label>
              <Input
                value={editing.country ?? ""}
                onChange={(e) => setEditing({ ...editing, country: e.target.value })}
              />
            </div>
            <div>
              <Label>E-posta (gizli — ziyaretçilere gösterilmez)</Label>
              <Input
                type="email"
                value={editing.email ?? ""}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Web sitesi</Label>
              <Input
                value={editing.website ?? ""}
                onChange={(e) => setEditing({ ...editing, website: e.target.value })}
              />
            </div>
            <div>
              <Label>Diller (virgülle)</Label>
              <Input
                value={(editing.languages ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    languages: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <Label>Uzmanlıklar (virgülle)</Label>
              <Input
                value={(editing.specializations ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    specializations: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <Label>Sıra numarası</Label>
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={editing.published}
                onCheckedChange={(v) => setEditing({ ...editing, published: v })}
              />
              <Label>Yayında</Label>
            </div>
          </div>

          <div className="mt-4">
            <Label>Fotoğraf</Label>
            <div className="flex items-center gap-4">
              {editing.photo_url ? (
                <img
                  src={editing.photo_url}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                  Yok
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoFile(f);
                }}
                disabled={uploading}
              />
              <MediaPickerButton onPick={(m) => setEditing({ ...editing, photo_url: m.public_url })} />
            </div>
            <Input
              className="mt-2"
              placeholder="veya dış fotoğraf URL'si"
              value={editing.photo_url ?? ""}
              onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <Label>Kısa Bio (≤300 karakter)</Label>
            <Textarea
              rows={3}
              maxLength={300}
              value={editing.short_bio ?? ""}
              onChange={(e) => setEditing({ ...editing, short_bio: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {(editing.short_bio?.length ?? 0)} / 300
            </p>
          </div>

          <div className="mt-4">
            <Label>Uzun Bio</Label>
            <Textarea
              rows={8}
              value={editing.long_bio ?? ""}
              onChange={(e) => setEditing({ ...editing, long_bio: e.target.value })}
            />
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              İptal
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const APP_STATUS_LABEL: Record<ApplicationStatus, string> = {
  yeni: "Yeni",
  incelemede: "İncelemede",
  gorusme: "Görüşme",
  kabul: "Kabul",
  red: "Red",
};

type PromoteCategory = keyof typeof P_CATEGORY_LABEL;

function PractitionerApplications() {
  const list = useServerFn(listAdminApplications);
  const getUrl = useServerFn(getAdminApplicationFileUrl);
  const update = useServerFn(updateAdminApplication);
  const acceptAsPractitioner = useServerFn(acceptApplicationAsPractitioner);
  const promoteUser = useServerFn(makeUserPractitioner);
  const [rows, setRows] = useState<AdminApplicationRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteCategory, setPromoteCategory] = useState<PromoteCategory>("kocluk");
  const [promoteCity, setPromoteCity] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);

  const reload = useCallback(async () => {
    const r = await list();
    setRows((r ?? []) as AdminApplicationRow[]);
  }, [list]);
  useEffect(() => {
    reload();
  }, [reload]);

  const opened = rows.find((r) => r.id === openId) ?? null;
  useEffect(() => {
    setNote(opened?.admin_note ?? "");
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openFile(path: string | null) {
    if (!path) return;
    try {
      const { url } = (await getUrl({ data: { path } })) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Dosya açılamadı");
    }
  }

  async function changeStatus(id: string, status: ApplicationStatus) {
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

  async function acceptAndPromote(app: AdminApplicationRow) {
    setAcceptBusy(true);
    try {
      const res = (await acceptAsPractitioner({ data: { id: app.id } })) as {
        created: boolean;
      };
      toast.success(
        res.created
          ? "Kabul edildi, pro rolü verildi ve taslak uygulayıcı kaydı oluşturuldu."
          : "Kabul edildi, pro rolü verildi. Uygulayıcı kaydı zaten mevcut.",
      );
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "İşlem başarısız");
    } finally {
      setAcceptBusy(false);
    }
  }

  async function promoteByEmail() {
    if (!promoteEmail.trim()) return;
    setPromoteBusy(true);
    try {
      const res = (await promoteUser({
        data: {
          email: promoteEmail.trim(),
          category: promoteCategory,
          city: promoteCity.trim(),
        },
      })) as {
        created: boolean;
      };
      toast.success(
        res.created
          ? "Kullanıcıya pro rolü verildi ve taslak uygulayıcı kaydı oluşturuldu."
          : "Kullanıcıya pro rolü verildi. Uygulayıcı kaydı zaten mevcut.",
      );
      setPromoteEmail("");
      setPromoteCity("");
    } catch (e: any) {
      toast.error(e?.message ?? "İşlem başarısız");
    } finally {
      setPromoteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {rows.length} başvuru — en yeni üstte.
      </p>
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <Label>Bu kullanıcıyı uygulayıcı yap (başvuru olmadan)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-72"
            type="email"
            placeholder="hesap e-postası"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
          />
          <Select
            value={promoteCategory}
            onValueChange={(v) => setPromoteCategory(v as PromoteCategory)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(P_CATEGORY_LABEL) as PromoteCategory[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {P_CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-40"
            placeholder="şehir (opsiyonel)"
            value={promoteCity}
            onChange={(e) => setPromoteCity(e.target.value)}
          />
          <Button size="sm" disabled={promoteBusy} onClick={promoteByEmail}>
            {promoteBusy ? "İşleniyor…" : "Uygulayıcı yap"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Var olan bir hesaba pro rolü verir ve yayınlanmamış taslak uygulayıcı kaydı oluşturur.
        </p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell>{P_CATEGORY_LABEL[r.category]}</TableCell>
                <TableCell>{r.city ?? "—"}</TableCell>
                <TableCell>{fmtDate(r.created_at)}</TableCell>
                <TableCell>{APP_STATUS_LABEL[r.status]}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                    Aç
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Henüz başvuru yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      {opened ? (
        <div className="space-y-4 rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl">{opened.full_name}</h3>
              <p className="text-sm text-muted-foreground">
                {opened.email}
                {opened.phone ? ` · ${opened.phone}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {P_CATEGORY_LABEL[opened.category]} ·{" "}
                {opened.city ?? "Şehir belirtilmemiş"} ·{" "}
                {fmtDate(opened.created_at)}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
              Kapat
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Meslek / Unvan</Label>
              <p className="text-sm">{opened.profession_title ?? "—"}</p>
            </div>
            <div>
              <Label>Deneyim (yıl)</Label>
              <p className="text-sm">{opened.experience_years ?? "—"}</p>
            </div>
          </div>

          <div>
            <Label>Niyet metni</Label>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {opened.motivation}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!opened.cv_path}
              onClick={() => openFile(opened.cv_path)}
            >
              Özgeçmişi indir
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!opened.diploma_path}
              onClick={() => openFile(opened.diploma_path)}
            >
              Diplomayı indir
            </Button>
          </div>

          <div>
            <Label>Durum</Label>
            <Select
              value={opened.status}
              onValueChange={(v) => changeStatus(opened.id, v as ApplicationStatus)}
            >
              <SelectTrigger className="mt-1 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(APP_STATUS_LABEL) as ApplicationStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {APP_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button
              size="sm"
              disabled={!opened.user_id || acceptBusy}
              onClick={() => acceptAndPromote(opened)}
            >
              {acceptBusy ? "İşleniyor…" : "Kabul et ve uygulayıcı yap"}
            </Button>
            {!opened.user_id ? (
              <span className="text-xs text-muted-foreground">
                Bu başvuru bir hesaba bağlı değil (eski kayıt). Yukarıdaki e-posta alanını
                kullanın.
              </span>
            ) : null}
          </div>

          <div>
            <Label>Admin notu</Label>
            <Textarea
              className="mt-1"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={saveNote}>
                Notu kaydet
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PractitionerInquiries() {
  const list = useServerFn(listAdminPractitionerInquiries);
  const setStatus = useServerFn(updatePractitionerInquiryStatus);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      practitioner_id: string;
      practitioner_name: string;
      sender_name: string;
      sender_email: string;
      message: string;
      status: "acik" | "yanitlandi";
      created_at: string;
    }>
  >([]);

  const reload = useCallback(async () => {
    const r = await list();
    setRows((r ?? []) as any);
  }, [list]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function toggle(id: string, next: "acik" | "yanitlandi") {
    try {
      await setStatus({ data: { id, status: next } });
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    }
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Uygulayıcı</TableHead>
            <TableHead>Gönderen</TableHead>
            <TableHead>Mesaj</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.created_at)}</TableCell>
              <TableCell>{r.practitioner_name}</TableCell>
              <TableCell>
                <div className="text-sm">{r.sender_name}</div>
                <div className="text-xs text-muted-foreground">{r.sender_email}</div>
              </TableCell>
              <TableCell className="max-w-md whitespace-pre-wrap text-sm">{r.message}</TableCell>
              <TableCell>
                <Select
                  value={r.status}
                  onValueChange={(v) => toggle(r.id, v as "acik" | "yanitlandi")}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acik">Açık</SelectItem>
                    <SelectItem value="yanitlandi">Yanıtlandı</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                Henüz gelen talep yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

// -------------------- Newsletter Tab --------------------
function NewsletterTab() {
  const [sub, setSub] = useState<"aboneler" | "ayrilanlar" | "sayilar" | "sablon">("aboneler");
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setSub("aboneler")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${sub === "aboneler" ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}
        >Aboneler</button>
        <button
          onClick={() => setSub("ayrilanlar")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${sub === "ayrilanlar" ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}
        >Ayrılanlar</button>
        <button
          onClick={() => setSub("sayilar")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${sub === "sayilar" ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}
        >Bülten Sayıları</button>
        <button
          onClick={() => setSub("sablon")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${sub === "sablon" ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}
        >Şablon</button>
      </div>
      {sub === "aboneler" && <NewsletterSubscribers />}
      {sub === "ayrilanlar" && <NewsletterUnsubscribed />}
      {sub === "sayilar" && <NewsletterIssues />}
      {sub === "sablon" && <NewsletterTemplateSettings />}
    </div>
  );
}

function NewsletterUnsubscribed() {
  const listFn = useServerFn(listNewsletterUnsubscribed);
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState({ active: 0, unsub: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await listFn();
      setRows(r.rows as any[]);
      setCounts({ active: r.activeCount, unsub: r.unsubscribedCount });
    } finally { setLoading(false); }
  }, [listFn]);
  useEffect(() => { reload(); }, [reload]);

  function exportCsv() {
    const lines = ["email,unsubscribed_at,segments"];
    for (const r of rows) {
      lines.push([r.email, r.unsubscribed_at ?? "", (r.segments ?? []).join("|")].map((v: string) => JSON.stringify(v)).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ayrilanlar.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border p-3 text-sm"><div className="text-xs text-muted-foreground">Aktif abone</div><div className="text-2xl font-semibold">{counts.active}</div></div>
        <div className="rounded-md border border-border p-3 text-sm"><div className="text-xs text-muted-foreground">Ayrılan</div><div className="text-2xl font-semibold">{counts.unsub}</div></div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>CSV Dışa Aktar</Button>
        <Button variant="outline" onClick={reload}>Yenile</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ayrılan kayıt yok.</p>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>E-posta</TableHead><TableHead>Segment(ler)</TableHead><TableHead>Ayrılma Tarihi</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.email}>
                <TableCell className="font-mono text-xs">{r.email}</TableCell>
                <TableCell className="text-xs">{(r.segments ?? []).join(", ") || "—"}</TableCell>
                <TableCell className="text-xs">{r.unsubscribed_at ? fmtDate(r.unsubscribed_at) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">Ayrılma küresel geçerlidir: bu adresler hiçbir segmentte gönderim almaz.</p>
    </div>
  );
}

function NewsletterTemplateSettings() {
  const fetchList = useServerFn(listSiteSettings);
  const save = useServerFn(upsertSiteSetting);
  const [url, setUrl] = useState("");
  const [side, setSide] = useState("right");
  const [width, setWidth] = useState(96);
  const [opacity, setOpacity] = useState(50);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetchList().then((data) => {
      for (const r of data as any[]) {
        if (r.key === "newsletter_bg_image_url") setUrl(r.value ?? "");
        if (r.key === "newsletter_bg_side") setSide(r.value || "right");
        if (r.key === "newsletter_bg_width") setWidth(Number(r.value) || 96);
        if (r.key === "newsletter_bg_opacity") setOpacity(Number(r.value) || 50);
        if (r.key === "newsletter_bg_alt") setAlt(r.value ?? "");
      }
    });
  }, [fetchList]);

  // Seçilen görselin ölçülerinden otomatik yerleşim türetilir; hepsi
  // düzenlenebilir öneri olarak doldurulur.
  const applyAsset = (m: { public_url: string; width: number; height: number; has_transparency: boolean; label: string | null; original_filename: string }) => {
    setUrl(m.public_url);
    setAlt(m.label || "");
    const ratio = m.height > 0 ? m.width / m.height : 1;
    const wideLandscape = ratio >= 1.6;
    if (wideLandscape) {
      setSide("top");
      setWidth(Math.min(560, m.width || 560));
    } else {
      setSide("right");
      // e-posta genişliğinin ~1/3'ü (560px), doğal genişliğin üstüne çıkmadan
      setWidth(Math.max(48, Math.min(187, m.width || 187)));
    }
    setOpacity(m.has_transparency ? 85 : 35);
  };

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      await save({ data: { key: "newsletter_bg_image_url", value: url.trim() } });
      await save({ data: { key: "newsletter_bg_side", value: side } });
      await save({ data: { key: "newsletter_bg_width", value: String(Math.round(width)) } });
      await save({ data: { key: "newsletter_bg_opacity", value: String(Math.round(opacity)) } });
      await save({ data: { key: "newsletter_bg_alt", value: alt.trim() } });
      setMsg("Kaydedildi.");
    } catch (e: any) {
      setMsg("Hata: " + (e?.message ?? "bilinmiyor"));
    } finally { setBusy(false); }
  };

  const sideArt = side === "left" || side === "right";
  return (
    <Card title="Bülten Şablonu — Kenar Görseli">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <Label>Görsel (boş bırakılırsa şablon bugünkü haliyle gönderilir)</Label>
          <div className="flex flex-wrap items-center gap-3">
            {url ? (
              <img src={url} alt={alt || "seçili görsel"} className="h-16 w-auto rounded border border-border bg-muted/30 object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">Görsel seçilmedi</span>
            )}
            <MediaPickerButton onPick={applyAsset} label="Kütüphaneden Seç" />
            {url && <Button variant="outline" size="sm" onClick={() => setUrl("")}>Kaldır</Button>}
          </div>
        </div>
        <div>
          <Label>Konum</Label>
          <Select value={side} onValueChange={setSide}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="right">Sağ kenar</SelectItem>
              <SelectItem value="left">Sol kenar</SelectItem>
              <SelectItem value="top">Üst şerit</SelectItem>
              <SelectItem value="bottom">Alt şerit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Genişlik (px, {sideArt ? "kenar şeridi" : "tam şerit"})</Label>
          <Input type="number" min={40} max={560} value={width} onChange={(e) => setWidth(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label>Opaklık (%)</Label>
          <Input type="number" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label>Alternatif metin</Label>
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Görsel açıklaması" />
        </div>
      </div>

      {url && (
        <div className="mt-4">
          <Label>Önizleme (e-posta başlık alanı)</Label>
          <div className="mt-2 overflow-hidden rounded border border-[#e6dfcf] bg-[#fffdf7]" style={{ maxWidth: 560 }}>
            <div className="border-b border-[#eee5d0] px-6 py-4 text-center font-serif text-[15px] tracking-[0.14em] text-[#0f766e]">
              PFA — PSİKO-FONKSİYONEL ANALİZ
            </div>
            {side === "top" && (
              <img src={url} alt={alt} style={{ width: Math.min(560, width), opacity: opacity / 100, display: "block", margin: "0 auto" }} />
            )}
            <div className="flex">
              {side === "left" && <img src={url} alt={alt} style={{ width, opacity: opacity / 100, alignSelf: "flex-start" }} />}
              <div className="px-6 py-5 text-[13px] leading-relaxed text-[#1a2a2e]">
                <strong>Bülten başlığı</strong>
                <p className="mt-1">Bu alan bülten metninizin görüneceği yerdir. Görsel kenarda ya da şerit olarak yer alır.</p>
              </div>
              {side === "right" && <img src={url} alt={alt} style={{ width, opacity: opacity / 100, alignSelf: "flex-start" }} />}
            </div>
            {side === "bottom" && (
              <img src={url} alt={alt} style={{ width: Math.min(560, width), opacity: opacity / 100, display: "block", margin: "0 auto" }} />
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Görsel, e-postada gerçek bir resim olarak dar bir kenar şeridinde yer alır (CSS arka planı kullanılmaz).
        Görsel engellenirse metin bozulmaz. Yine de e-posta istemcileri (Outlook, bazı webmail'ler) görselleri
        ve arka planları farklı işler: gerçek gönderimden önce mutlaka “Önce bana gönder” ile test edin.
      </p>
    </Card>
  );
}

function NewsletterSubscribers() {
  const listFn = useServerFn(listNewsletterSubscribers);
  const delFn = useServerFn(deleteNewsletterSubscriber);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listFn();
      setRows(r as any[]);
    } finally { setLoading(false); }
  }, [listFn]);
  useEffect(() => { reload(); }, [reload]);

  const filtered = rows.filter((r) => {
    if (seg !== "all" && r.segment !== seg) return false;
    if (q && !`${r.email} ${r.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: rows.filter((r) => !r.unsubscribed_at).length,
    merakli: rows.filter((r) => r.segment === "merakli" && !r.unsubscribed_at).length,
    profesyonel: rows.filter((r) => r.segment === "profesyonel" && !r.unsubscribed_at).length,
    kurumsal: rows.filter((r) => r.segment === "kurumsal" && !r.unsubscribed_at).length,
  };

  function exportCsv() {
    const header = ["email","full_name","segment","source","consent","unsubscribed_at","created_at"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(header.map((k) => JSON.stringify((r as any)[k] ?? "")).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "aboneler.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-border p-3 text-sm"><div className="text-muted-foreground text-xs">Toplam</div><div className="text-2xl font-semibold">{stats.total}</div></div>
        <div className="rounded-md border border-border p-3 text-sm"><div className="text-muted-foreground text-xs">Meraklı</div><div className="text-2xl font-semibold">{stats.merakli}</div></div>
        <div className="rounded-md border border-border p-3 text-sm"><div className="text-muted-foreground text-xs">Profesyonel</div><div className="text-2xl font-semibold">{stats.profesyonel}</div></div>
        <div className="rounded-md border border-border p-3 text-sm"><div className="text-muted-foreground text-xs">Kurumsal</div><div className="text-2xl font-semibold">{stats.kurumsal}</div></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Ara (e-posta, ad)" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={seg} onValueChange={setSeg}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm segmentler</SelectItem>
            <SelectItem value="merakli">Meraklı</SelectItem>
            <SelectItem value="profesyonel">Profesyonel</SelectItem>
            <SelectItem value="kurumsal">Kurumsal</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}>CSV Dışa Aktar</Button>
        <Button variant="outline" onClick={reload}>Yenile</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>E-posta</TableHead><TableHead>Ad</TableHead><TableHead>Segment</TableHead><TableHead>Kaynak</TableHead><TableHead>Tarih</TableHead><TableHead>Durum</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.email}</TableCell>
                <TableCell>{r.full_name ?? "—"}</TableCell>
                <TableCell>{r.segment}</TableCell>
                <TableCell>{r.source ?? "—"}</TableCell>
                <TableCell className="text-xs">{fmtDate(r.created_at)}</TableCell>
                <TableCell className="text-xs">{r.unsubscribed_at ? "Ayrıldı" : "Aktif"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm("Silinsin mi?")) return;
                    await delFn({ data: { id: r.id } });
                    reload();
                  }}>Sil</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function NewsletterIssues() {
  const listFn = useServerFn(listNewsletterIssues);
  const upsertFn = useServerFn(upsertNewsletterIssue);
  const delFn = useServerFn(deleteNewsletterIssue);
  const sendFn = useServerFn(sendNewsletterIssue);
  const testFn = useServerFn(sendNewsletterTest);
  const cfgFn = useServerFn(getNewsletterConfigStatus);

  const [issues, setIssues] = useState<any[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [rows, cfg] = await Promise.all([listFn(), cfgFn()]);
    setIssues(rows as any[]);
    setEmailConfigured((cfg as any).emailConfigured);
  }, [listFn, cfgFn]);
  useEffect(() => { reload(); }, [reload]);

  if (editing) {
    return <IssueEditor
      initial={editing}
      emailConfigured={emailConfigured}
      error={sendError}
      onCancel={() => setEditing(null)}
      onSave={async (v) => {
        const r = await upsertFn({ data: v });
        toast.success("Kaydedildi");
        setEditing({ ...v, id: (r as any).id });
        reload();
      }}
      onSend={async (id) => {
        if (!confirm("Bu bülteni hedef aboneler için göndermek istediğinize emin misiniz?")) return;
        setSendError(null);
        try {
          const r: any = await sendFn({ data: { issueId: id } });
          toast.success(
            `Gönderildi: ${r.sent}/${r.total}` +
              (r.suppressed ? ` · ${r.suppressed} ayrılmış adres engellendi` : ""),
          );
          reload(); setEditing(null);
        } catch (e: any) {
          const m = e?.message ?? "Gönderim başarısız";
          toast.error(m);
          setSendError(m);
        }
      }}
      onTest={async (id) => {
        setSendError(null);
        try {
          const r: any = await testFn({ data: { issueId: id } });
          toast.success(`Test gönderildi: ${r.sentTo}`);
        } catch (e: any) {
          const m = e?.message ?? "Test başarısız";
          toast.error(m);
          setSendError(m);
        }
      }}
    />;
  }

  return (
    <div className="space-y-4">
      {!emailConfigured && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          E-posta gönderimi için Resend kurulumu bekleniyor. Aboneler eklenebilir, sayılar taslak olarak kaydedilebilir; gönderim düğmesi pasiftir.
        </div>
      )}
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">{issues.length} bülten sayısı</div>
        <Button onClick={() => setEditing({ id: null, title: "", segment: "tumu", content_md: "" })}>Yeni Sayı</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Başlık</TableHead><TableHead>Segment</TableHead><TableHead>Durum</TableHead><TableHead>Gönderilen</TableHead><TableHead>Oluşturma</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {issues.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.title}</TableCell>
              <TableCell>{r.segment}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>{r.sent_count ?? "—"}</TableCell>
              <TableCell className="text-xs">{fmtDate(r.created_at)}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Düzenle</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("Silinsin mi?")) return;
                  await delFn({ data: { id: r.id } });
                  reload();
                }}>Sil</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function IssueEditor({ initial, emailConfigured, error, onCancel, onSave, onSend, onTest }: {
  initial: any;
  emailConfigured: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (v: any) => Promise<void>;
  onSend: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [segment, setSegment] = useState(initial.segment ?? "tumu");
  const [content, setContent] = useState(initial.content_md ?? "");
  const id = initial.id as string | null;
  const sent = initial.status === "gonderildi";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl">{id ? "Sayıyı Düzenle" : "Yeni Bülten Sayısı"}</h3>
        <Button variant="ghost" onClick={onCancel}>Kapat</Button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Gönderim hatası: {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label>Başlık</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Label>Hedef Segment</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tumu">Tümü</SelectItem>
              <SelectItem value="merakli">Meraklı</SelectItem>
              <SelectItem value="profesyonel">Profesyonel</SelectItem>
              <SelectItem value="kurumsal">Kurumsal</SelectItem>
            </SelectContent>
          </Select>
          <Label>İçerik (Markdown, {"{{unsubscribe_url}}"} otomatik değiştirilir)</Label>
          <Textarea rows={18} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />
        </div>
        <div>
          <Label>Önizleme</Label>
          <div className="mt-2 rounded-md border border-border bg-[#fffdf7] p-6 text-sm text-[#1a2a2e]">
            <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-[#0f766e]">PFA — Psiko-Fonksiyonel Analiz</div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
            <div className="mt-6 border-t border-border pt-3 text-center text-[10px] text-muted-foreground">
              Abonelikten ayrıl
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => onSave({ id, title, segment, content_md: content })}>Kaydet</Button>
        {id && !sent && (
          <>
            <Button variant="outline" disabled={!emailConfigured} onClick={() => onTest(id)}>Önce bana gönder</Button>
            <Button disabled={!emailConfigured} onClick={() => onSend(id)}>Aboneler için gönder</Button>
          </>
        )}
        {sent && <span className="text-xs text-muted-foreground">Bu sayı gönderilmiş.</span>}
      </div>
    </div>
  );
}
