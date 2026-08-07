import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSessionAvailability } from "@/lib/session-availability.functions";
import { hhmm, upcomingDatesFor } from "@/lib/session-availability";

// Single source of truth for the preferred date/time on session inquiries.
// The slots shown here are the ones the admin has switched on in
// Admin → Site Ayarları → Seans Müsaitliği. Choosing one is a PREFERENCE,
// never a confirmed booking: confirmation always comes from Burak by e-mail.
//
// FUTURE: when practitioner selection ships, pass the chosen practitioner id
// down and filter the fetched slots by it (session_availability already has a
// nullable practitioner_id column). Nothing else here needs to change.

type Props = {
  value: string;
  onChange: (v: string) => void;
  locale?: "tr" | "en";
  className?: string;
};

const chip = (on: boolean) =>
  `rounded-md border px-3 py-2 text-xs transition ${
    on
      ? "border-accent bg-accent text-accent-foreground"
      : "border-border hover:border-foreground"
  }`;

export function SessionSlotPicker({ value, onChange, locale = "tr", className }: Props) {
  const fetchSlots = useServerFn(listSessionAvailability);
  const { data: slots, isLoading } = useQuery({
    queryKey: ["session-availability"],
    queryFn: () => fetchSlots(),
    staleTime: 5 * 60 * 1000,
  });

  const en = locale === "en";
  const [date, setDate] = useState<string | null>(null);

  const weekdays = useMemo(
    () => Array.from(new Set((slots ?? []).map((s) => s.weekday))),
    [slots],
  );
  const dates = useMemo(() => upcomingDatesFor(weekdays, 8), [weekdays]);
  const times = useMemo(() => {
    if (!date) return [];
    const wd = new Date(`${date}T12:00:00`).getDay();
    return (slots ?? []).filter((s) => s.weekday === wd).map((s) => hhmm(s.slot_time));
  }, [slots, date]);

  const dateFmt = new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  if (isLoading) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        {en ? "Loading available times…" : "Uygun saatler yükleniyor…"}
      </p>
    );
  }

  // Graceful empty state — the inquiry itself is never blocked.
  if (!slots || slots.length === 0) {
    return (
      <div className={`grid gap-2 ${className ?? ""}`}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {en
            ? "There are no published times at the moment — you can still leave your request and note a time that suits you."
            : "Şu an uygun saat bulunmuyor; talebinizi yine de bırakabilir, size uygun zamanı yazabilirsiniz."}
        </p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            en
              ? "A time that suits you (e.g. weekdays after 15:00)"
              : "Size uygun gün / saat (örn. hafta içi 15:00 sonrası)"
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${className ?? ""}`}>
      <div>
        <div className="text-xs tracking-[0.2em] text-muted-foreground">
          {en ? "PREFERRED DAY" : "TERCİH ETTİĞİNİZ GÜN"}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {dates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDate(d);
                onChange("");
              }}
              className={chip(date === d)}
            >
              {dateFmt.format(new Date(`${d}T12:00:00`))}
            </button>
          ))}
        </div>
      </div>

      {date ? (
        <div>
          <div className="text-xs tracking-[0.2em] text-muted-foreground">
            {en ? "PREFERRED TIME" : "TERCİH ETTİĞİNİZ SAAT"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {times.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange(`${date} ${t}`)}
                className={chip(value === `${date} ${t}`)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {en
          ? "This is your preferred time, not a confirmed booking — Burak confirms the appointment by e-mail."
          : "Seçtiğiniz zaman tercih niteliğindedir; randevu onayı e-posta ile Burak tarafından verilir."}
      </p>
    </div>
  );
}
