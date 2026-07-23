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
  createWebinarBannerUploadUrl,
  refreshWebinarBannerUrl,
  listSiteSettings,
  upsertSiteSetting,
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
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="pro">Pro Lisanslar</TabsTrigger>
            <TabsTrigger value="questions">PFA Ölçeği</TabsTrigger>
            <TabsTrigger value="webinars">Webinarlar</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="ebooks">E-Kitaplar</TabsTrigger>
            <TabsTrigger value="orders">Siparişler</TabsTrigger>
            <TabsTrigger value="settings">Site Ayarları</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="overview"><OverviewTab /></TabsContent>
            <TabsContent value="products"><ProductsTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="pro"><ProLicensesTab /></TabsContent>
            <TabsContent value="questions"><QuestionsTab /></TabsContent>
            <TabsContent value="webinars"><WebinarsTab /></TabsContent>
            <TabsContent value="blog"><BlogTab /></TabsContent>
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
  const [rows, setRows] = useState<any[]>([]);
  const reload = useCallback(() => { fetchList().then(setRows); }, [fetchList]);
  useEffect(() => { reload(); }, [reload]);
  const save = async (id: string, patch: any) => {
    await update({ data: { id, ...patch } });
    reload();
  };
  return (
    <div className="space-y-3">
      {rows.map((p) => (
        <Card key={p.id}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Ad (TR)</Label>
              <Input defaultValue={p.name_tr} onBlur={(e) => e.target.value !== p.name_tr && save(p.id, { name_tr: e.target.value })} />
            </div>
            <div>
              <Label>Ad (EN)</Label>
              <Input defaultValue={p.name_en} onBlur={(e) => e.target.value !== p.name_en && save(p.id, { name_en: e.target.value })} />
            </div>
            <div>
              <Label>Açıklama (TR)</Label>
              <Textarea defaultValue={p.description_tr ?? ""} onBlur={(e) => e.target.value !== (p.description_tr ?? "") && save(p.id, { description_tr: e.target.value })} />
            </div>
            <div>
              <Label>Açıklama (EN)</Label>
              <Textarea defaultValue={p.description_en ?? ""} onBlur={(e) => e.target.value !== (p.description_en ?? "") && save(p.id, { description_en: e.target.value })} />
            </div>
            <div>
              <Label>Fiyat ($)</Label>
              <Input type="number" step="0.01" defaultValue={(p.price_cents / 100).toFixed(2)} onBlur={(e) => {
                const cents = Math.round(parseFloat(e.target.value) * 100);
                if (!isNaN(cents) && cents !== p.price_cents) save(p.id, { price_cents: cents });
              }} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={p.active} onCheckedChange={(v) => save(p.id, { active: v })} />
              <span className="text-sm">{p.active ? "Aktif" : "Pasif"} — {p.slug}</span>
            </div>
          </div>
        </Card>
      ))}
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
                  <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Silinsin mi?")) { await del({ data: { id: s.id } }); reload(); } }}>Sil</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function WebinarForm({ initial, products, onSave, onCancel }: { initial: any; products: any[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const upd = (k: string, v: any) => setD({ ...d, [k]: v });
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
      <div className="flex gap-2 md:col-span-2">
        <Button onClick={() => onSave({ ...d, starts_at: new Date(d.starts_at).toISOString(), capacity: d.capacity || null, join_url: d.join_url || null, notes: d.notes || null })}>Kaydet</Button>
        <Button variant="outline" onClick={onCancel}>İptal</Button>
      </div>
    </div>
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
