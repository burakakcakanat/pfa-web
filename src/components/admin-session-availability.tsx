import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminAddSessionSlot,
  adminDeleteSessionSlot,
  adminListSessionAvailability,
  adminSetSessionSlotActive,
} from "@/lib/session-availability.functions";
import { WEEKDAY_LABEL_TR, hhmm, type SessionSlot } from "@/lib/session-availability";

// Admin control for the slots offered on /seanslar. Switched-off slots are
// invisible to visitors. If nothing is switched on, the public form still
// accepts requests and asks for a free-text time preference.
//
// FUTURE: per-practitioner availability — session_availability.practitioner_id
// is already there (NULL = owner's own slots), so this screen only needs a
// practitioner selector added later.

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AdminSessionAvailability() {
  const list = useServerFn(adminListSessionAvailability);
  const add = useServerFn(adminAddSessionSlot);
  const setActive = useServerFn(adminSetSessionSlotActive);
  const remove = useServerFn(adminDeleteSessionSlot);

  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("10:00");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setSlots((await list()) as SessionSlot[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Müsaitlik yüklenemedi");
    }
  }, [list]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-6">
      <div>
        <h3 className="font-serif text-xl">Seans Müsaitliği</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Birebir seans formunda görünen gün/saat seçenekleri. Kapalı saatler ziyaretçiye
          gösterilmez. Hiç açık saat yoksa form yine çalışır; danışan zaman tercihini serbest
          metin olarak yazar. Seçim onay değil, tercihtir.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">Gün</span>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABEL_TR[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">Saat</span>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 w-32"
          />
        </label>
        <Button
          type="button"
          disabled={busy}
          onClick={() => run(() => add({ data: { weekday, slot_time: time } }), "Saat eklendi")}
        >
          Saat ekle
        </Button>
      </div>

      <div className="divide-y divide-border rounded-md border border-border">
        {slots.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Henüz tanımlı saat yok.</p>
        ) : (
          DAY_ORDER.filter((d) => slots.some((s) => s.weekday === d)).map((d) => (
            <div key={d} className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {WEEKDAY_LABEL_TR[d]}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots
                  .filter((s) => s.weekday === d)
                  .map((s) => (
                    <span
                      key={s.id}
                      className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                        s.active ? "border-accent/60" : "border-border opacity-50"
                      }`}
                    >
                      {hhmm(s.slot_time)}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => setActive({ data: { id: s.id, active: !s.active } }),
                            s.active ? "Saat kapatıldı" : "Saat açıldı",
                          )
                        }
                        className="underline underline-offset-2"
                      >
                        {s.active ? "kapat" : "aç"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => remove({ data: { id: s.id } }), "Saat silindi")}
                        className="text-destructive underline underline-offset-2"
                      >
                        sil
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
