import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listSiteMedia,
  createMediaUploadUrl,
  finalizeMediaUpload,
  updateSiteMedia,
  deleteSiteMedia,
} from "@/lib/media.functions";

export type MediaRow = {
  id: string;
  storage_path: string;
  public_url: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
  has_transparency: boolean;
  label: string | null;
  tags: string[] | null;
  created_at: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const fmtBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`;

// Genişlik/yükseklik ve alfa kanalı tarayıcıda ölçülür; alfa yalnızca
// PNG/WEBP için piksel örneklemesiyle, SVG için varsayılan olarak doğrudur.
async function probeImage(file: File): Promise<{ width: number; height: number; hasAlpha: boolean }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Görsel okunamadı."));
      el.src = url;
    });
    const width = img.naturalWidth || 0;
    const height = img.naturalHeight || 0;
    if (file.type === "image/svg+xml") return { width: width || 512, height: height || 512, hasAlpha: true };
    if (file.type === "image/jpeg") return { width, height, hasAlpha: false };
    let hasAlpha = false;
    try {
      const S = 64;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(S, width || S);
      canvas.height = Math.min(S, height || S);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < px.length; i += 4) {
          if (px[i] < 250) { hasAlpha = true; break; }
        }
      }
    } catch { /* örnekleme başarısız: en iyi tahmin false */ }
    return { width, height, hasAlpha };
  } finally {
    URL.revokeObjectURL(url);
  }
}

type UploadState = { name: string; status: "bekliyor" | "yükleniyor" | "tamam" | "hata"; error?: string };

export function useMediaLibrary() {
  const listFn = useServerFn(listSiteMedia);
  const createUrl = useServerFn(createMediaUploadUrl);
  const finalize = useServerFn(finalizeMediaUpload);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [newsletterUrl, setNewsletterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await listFn()) as { rows: MediaRow[]; newsletterUrl: string | null };
      setRows(res.rows ?? []);
      setNewsletterUrl(res.newsletterUrl ?? null);
    } catch (e: any) {
      toast.error("Görseller yüklenemedi: " + (e?.message ?? "bilinmiyor"));
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { reload(); }, [reload]);

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploads(files.map((f) => ({ name: f.name, status: "bekliyor" as const })));
    const setOne = (i: number, patch: Partial<UploadState>) =>
      setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (!ALLOWED.includes(file.type)) throw new Error("Yalnızca PNG, JPG, WEBP, SVG kabul edilir.");
        if (file.size > MAX_BYTES) throw new Error(`Dosya 5 MB sınırını aşıyor (${fmtBytes(file.size)}).`);
        setOne(i, { status: "yükleniyor" });
        const probe = await probeImage(file);
        const { path, token } = await createUrl({
          data: { filename: file.name, mimeType: file.type, byteSize: file.size },
        });
        const { error } = await supabase.storage
          .from("site-media")
          .uploadToSignedUrl(path, token, file, { upsert: true });
        if (error) throw new Error(error.message);
        await finalize({
          data: {
            storagePath: path,
            originalFilename: file.name,
            mimeType: file.type,
            byteSize: file.size,
            width: probe.width,
            height: probe.height,
            hasTransparency: probe.hasAlpha,
            label: null,
          },
        });
        setOne(i, { status: "tamam" });
      } catch (e: any) {
        setOne(i, { status: "hata", error: e?.message ?? "bilinmiyor" });
      }
    }
    await reload();
  }, [createUrl, finalize, reload]);

  return { rows, newsletterUrl, loading, uploads, upload, reload, setUploads };
}

export function MediaDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files ?? []));
      }}
      className={`rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${over ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <p className="text-muted-foreground">
        Görselleri buraya sürükleyin veya dosya seçin — PNG, JPG, WEBP, SVG · en fazla 5 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ""; }}
      />
      <Button variant="outline" className="mt-3" onClick={() => inputRef.current?.click()}>Dosya Seç</Button>
    </div>
  );
}

export function MediaUploadProgress({ uploads }: { uploads: UploadState[] }) {
  if (uploads.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs">
      {uploads.map((u, i) => (
        <li key={`${u.name}-${i}`} className="flex items-start justify-between gap-3 rounded border border-border px-2 py-1">
          <span className="font-mono">{u.name}</span>
          <span className={u.status === "hata" ? "text-destructive" : "text-muted-foreground"}>
            {u.status === "hata" ? `Hata: ${u.error}` : u.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MediaGrid({
  rows,
  onSelect,
}: {
  rows: MediaRow[];
  onSelect: (row: MediaRow) => void;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Kayıt bulunamadı.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {rows.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="group overflow-hidden rounded-md border border-border bg-card text-left transition-shadow hover:shadow-md"
        >
          <div className="flex h-28 items-center justify-center bg-muted/40 p-2">
            <img src={r.public_url} alt={r.label ?? r.original_filename} loading="lazy" className="max-h-24 w-auto max-w-full object-contain" />
          </div>
          <div className="px-2 py-1.5">
            <div className="truncate text-xs font-medium">{r.label || r.original_filename}</div>
            <div className="text-[11px] text-muted-foreground">{r.width}×{r.height}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function useMediaFilter(rows: MediaRow[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr-TR");
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.label ?? ""} ${r.original_filename} ${(r.tags ?? []).join(" ")}`
        .toLocaleLowerCase("tr-TR")
        .includes(term),
    );
  }, [rows, q]);
  return { q, setQ, filtered };
}

/** Kütüphaneden bir görsel seçtiren düğme + diyalog. URL alanlarının yanında kullanılır. */
export function MediaPickerButton({
  onPick,
  label = "Kütüphaneden Seç",
  variant = "outline",
}: {
  onPick: (row: MediaRow) => void;
  label?: string;
  variant?: "outline" | "secondary" | "default";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)}>{label}</Button>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onPick={(row) => { onPick(row); setOpen(false); }}
      />
    </>
  );
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (row: MediaRow) => void;
}) {
  const { rows, loading, uploads, upload } = useMediaLibrary();
  const { q, setQ, filtered } = useMediaFilter(rows);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Görsel Kütüphanesi</DialogTitle>
          <DialogDescription>
            Marka görselleri. Kitap dosyaları ve kullanıcı belgeleri bu kütüphanede yer almaz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ara</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Etiket veya ad…" />
          </div>
          <MediaDropzone onFiles={upload} />
          <MediaUploadProgress uploads={uploads} />
          {loading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : (
            <MediaGrid rows={filtered} onSelect={onPick} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Admin "Görseller" sekmesinin gövdesi. */
export function MediaLibraryManager() {
  const { rows, newsletterUrl, loading, uploads, upload, reload } = useMediaLibrary();
  const { q, setQ, filtered } = useMediaFilter(rows);
  const updateFn = useServerFn(updateSiteMedia);
  const deleteFn = useServerFn(deleteSiteMedia);
  const [sel, setSel] = useState<MediaRow | null>(null);
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const openDetail = (row: MediaRow) => {
    setSel(row);
    setLabel(row.label ?? "");
    setTags((row.tags ?? []).join(", "));
  };

  const save = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      await updateFn({
        data: {
          id: sel.id,
          label: label.trim() || null,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        },
      });
      toast.success("Kaydedildi");
      await reload();
      setSel(null);
    } catch (e: any) {
      toast.error("Hata: " + (e?.message ?? "bilinmiyor"));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!sel) return;
    const inUse = newsletterUrl && newsletterUrl === sel.public_url;
    const warn = inUse
      ? "DİKKAT: Bu görsel şu anda bülten şablonunda kullanılıyor. Silinirse bülten kenar görseli kaldırılır. Devam edilsin mi?"
      : "Bu görseli kalıcı olarak silmek istiyor musunuz?";
    if (!confirm(warn)) return;
    setBusy(true);
    try {
      await deleteFn({ data: { id: sel.id } });
      toast.success("Silindi");
      await reload();
      setSel(null);
    } catch (e: any) {
      toast.error("Silme hatası: " + (e?.message ?? "bilinmiyor"));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <MediaDropzone onFiles={upload} />
      <MediaUploadProgress uploads={uploads} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>Ara (ad veya etiket)</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="örn. torus, logo" />
        </div>
        <Button variant="outline" onClick={reload}>Yenile</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : (
        <MediaGrid rows={filtered} onSelect={openDetail} />
      )}
      <p className="text-xs text-muted-foreground">
        Bu kütüphane yalnızca marka görselleri kutusunu kullanır; satın alınabilir kitap dosyaları,
        imzalar ve başvuru belgeleri ayrı, özel kutularda kalır.
      </p>

      <Dialog open={!!sel} onOpenChange={(v) => !v && setSel(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{sel?.label || sel?.original_filename}</DialogTitle>
            <DialogDescription>Görsel ayrıntıları ve etiketleri</DialogDescription>
          </DialogHeader>
          {sel && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-md border border-border bg-muted/30 p-3">
                <img src={sel.public_url} alt={sel.label ?? sel.original_filename} className="max-h-72 w-auto max-w-full object-contain" />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Dosya</dt><dd className="font-mono">{sel.original_filename}</dd></div>
                <div><dt className="text-muted-foreground">Tür</dt><dd className="font-mono">{sel.mime_type}</dd></div>
                <div><dt className="text-muted-foreground">Boyut</dt><dd>{sel.width}×{sel.height} px · {fmtBytes(sel.byte_size)}</dd></div>
                <div><dt className="text-muted-foreground">Saydamlık</dt><dd>{sel.has_transparency ? "Var (alfa kanalı)" : "Yok"}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">URL</dt><dd className="break-all font-mono">{sel.public_url}</dd></div>
              </dl>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Etiket (kısa ad)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
                <div><Label>Etiketler (virgülle)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={save} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
                <Button
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(sel.public_url); toast.success("URL kopyalandı"); }}
                >URL'yi kopyala</Button>
                <Button variant="destructive" onClick={remove} disabled={busy}>Sil</Button>
              </div>
              {newsletterUrl === sel.public_url && (
                <p className="text-xs text-destructive">Bu görsel şu anda bülten şablonunda kullanılıyor.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}