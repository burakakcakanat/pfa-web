// Danışan Profilleri + Takvim & Müsaitlik — uygulayıcı panelinin iki alt bölümü.
// Davet mantığına dokunulmaz: profil satırındaki "Davet gönder" yalnızca mevcut
// davet formundaki ad alanını ön-doldurur.
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listMyClients,
  saveMyClient,
  deleteMyClient,
  listMyAvailability,
  addMyAvailability,
  deleteMyAvailability,
  type PractitionerClient,
  type AvailabilityRow,
} from "@/lib/practitioner-clients.functions";
import { WEEKDAY_LABEL_TR, hhmm } from "@/lib/session-availability";

const EMPTY = {
  id: undefined as string | undefined,
  full_name: "",
  birth_year: "",
  gender: "",
  occupation: "",
  city: "",
  notes: "",
};

export function ClientProfilesSection({
  onInvite,
}: {
  onInvite?: (fullName: string) => void;
}) {
  const fetchList = useServerFn(listMyClients);
  const save = useServerFn(saveMyClient);
  const remove = useServerFn(deleteMyClient);

  const [rows, setRows] = useState<PractitionerClient[] | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await fetchList()) as PractitionerClient[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Danışan profilleri yüklenemedi.");
      setRows([]);
    }
  }, [fetchList]);
  useEffect(() => { load(); }, [load]);

  function edit(c: PractitionerClient) {
    setForm({
      id: c.id,
      full_name: c.full_name,
      birth_year: c.birth_year ? String(c.birth_year) : "",
      gender: c.gender ?? "",
      occupation: c.occupation ?? "",
      city: c.city ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          full_name: form.full_name,
          birth_year: form.birth_year ? Number(form.birth_year) : null,
          gender: form.gender,
          occupation: form.occupation,
          city: form.city,
          notes: form.notes,
        },
      });
      setForm({ ...EMPTY });
      setOpen(false);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm("Bu danışan profili silinsin mi?")) return;
    setErr(null);
    try {
      await remove({ data: { id } });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Silinemedi.");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl">Danışan Profilleri</h3>
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY });
            setOpen((v) => !v);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs"
        >
          {open ? "Formu kapat" : "Yeni profil"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Kendi kayıtlarınız için tutulur; danışanınız bu bilgileri görmez.
      </p>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
          <Field label="Ad Soyad" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
          <Field
            label="Doğum yılı"
            value={form.birth_year}
            onChange={(v) => setForm({ ...form, birth_year: v.replace(/\D/g, "").slice(0, 4) })}
          />
          <Field label="Cinsiyet" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
          <Field label="Meslek" value={form.occupation} onChange={(v) => setForm({ ...form, occupation: v })} />
          <Field label="Şehir" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <label className="flex flex-col sm:col-span-2">
            <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">Notlar</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={busy || form.full_name.trim().length < 2}
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm text-accent-foreground disabled:opacity-60"
            >
              {busy ? "Kaydediliyor…" : form.id ? "Güncelle" : "Ekle"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => { setForm({ ...EMPTY }); setOpen(false); }}
                className="text-xs text-muted-foreground underline underline-offset-4"
              >
                Vazgeç
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {err ? <p className="mt-3 text-sm text-destructive">{err}</p> : null}

      <div className="mt-4">
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz danışan profili eklemediniz.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 font-medium">{c.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {[c.birth_year ? `${c.birth_year}` : null, c.city, c.occupation]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                {onInvite ? (
                  <button
                    type="button"
                    onClick={() => onInvite(c.full_name)}
                    className="rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                  >
                    Davet gönder
                  </button>
                ) : null}
                <button type="button" onClick={() => edit(c)} className="rounded-md border border-border px-2.5 py-1 text-xs">
                  Düzenle
                </button>
                <button type="button" onClick={() => del(c.id)} className="text-xs text-destructive">
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AvailabilitySection() {
  const fetchList = useServerFn(listMyAvailability);
  const add = useServerFn(addMyAvailability);
  const remove = useServerFn(deleteMyAvailability);

  const [rows, setRows] = useState<AvailabilityRow[] | null>(null);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await fetchList()) as AvailabilityRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Müsaitlik yüklenemedi.");
      setRows([]);
    }
  }, [fetchList]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await add({ data: { weekday, start_time: start, end_time: end, note } });
      setNote("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Eklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    setErr(null);
    try {
      await remove({ data: { id } });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Silinemedi.");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-serif text-xl">Takvim & Müsaitlik</h3>
      <div className="mt-3 rounded-md border border-accent/50 bg-accent/5 px-3 py-2 text-xs text-foreground/80">
        Müsaitlik bilgisi şimdilik kayıt amaçlıdır; çevrimiçi randevu sistemi eklendiğinde
        buradan beslenecek.
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border p-4">
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">Gün</span>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {WEEKDAY_LABEL_TR.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">Başlangıç</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">Bitiş</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col">
          <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">Not (opsiyonel)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-60"
        >
          {busy ? "Ekleniyor…" : "Saat ekle"}
        </button>
      </form>

      {err ? <p className="mt-3 text-sm text-destructive">{err}</p> : null}

      <div className="mt-4">
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz müsaitlik saati tanımlamadınız.</p>
        ) : (
          <div className="space-y-3">
            {WEEKDAY_LABEL_TR.map((label, day) => {
              const dayRows = rows.filter((r) => r.weekday === day);
              if (dayRows.length === 0) return null;
              return (
                <div key={label} className="rounded-md border border-border">
                  <div className="border-b border-border px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-accent">
                    {label}
                  </div>
                  <ul className="divide-y divide-border">
                    {dayRows.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                        <span className="font-mono">
                          {hhmm(r.start_time)} – {hhmm(r.end_time)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {r.note ?? ""}
                        </span>
                        <button type="button" onClick={() => del(r.id)} className="text-xs text-destructive">
                          Sil
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col">
      <span className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
