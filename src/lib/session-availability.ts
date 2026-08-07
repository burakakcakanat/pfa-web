// Shared, client-safe types and helpers for admin-managed session availability.
//
// FUTURE (practitioner selection): session_availability already carries a
// nullable practitioner_id. When practitioners can be booked directly, the
// public form will pass the chosen practitioner and filter slots by it; rows
// with practitioner_id IS NULL remain the owner's own (default) availability.
// No migration is needed for that step.

export type SessionSlot = {
  id: string;
  practitioner_id: string | null;
  weekday: number; // 0 = Sunday … 6 = Saturday
  slot_time: string; // "HH:MM" or "HH:MM:SS"
  active: boolean;
  sort_order: number;
  note: string | null;
};

export const WEEKDAY_LABEL_TR = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

export const WEEKDAY_LABEL_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "14:00:00" → "14:00" */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}

/**
 * Upcoming calendar dates (starting tomorrow) whose weekday has at least one
 * active slot. Returns ISO yyyy-mm-dd strings.
 */
export function upcomingDatesFor(weekdays: number[], howMany = 8): string[] {
  const allowed = new Set(weekdays);
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 60 && out.length < howMany; i++) {
    d.setDate(d.getDate() + 1);
    if (allowed.has(d.getDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
