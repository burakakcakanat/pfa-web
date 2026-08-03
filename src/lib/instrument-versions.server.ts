// Sürüm envanteri ve iki sürüm arası madde farkı (yalnızca sunucu tarafı).

export type VersionRow = {
  instrument: "pfa" | "sevenq";
  version: number;
  label: string | null;
  notes: string | null;
  is_current: boolean;
  created_at: string;
  item_count: number;
  session_count: number;
};

type SnapshotItem = {
  question_id: string;
  item_code: string | null;
  level: number | null;
  capacity: string | null;
  text_tr: string | null;
  reverse_coded: boolean | null;
  is_pilot_only: boolean | null;
  active: boolean | null;
};

export async function loadVersionInventory(): Promise<VersionRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [versions, snaps, pfaSessions, sqSessions] = await Promise.all([
    supabaseAdmin
      .from("instrument_versions")
      .select("instrument, version, label, notes, is_current, created_at")
      .order("instrument")
      .order("version", { ascending: false }),
    supabaseAdmin.from("instrument_item_snapshots").select("instrument, version, active"),
    supabaseAdmin.from("assessment_sessions").select("instrument_version"),
    supabaseAdmin.from("sevenq_sessions").select("instrument_version"),
  ]);

  const itemCounts = new Map<string, number>();
  for (const s of (snaps.data ?? []) as { instrument: string; version: number; active: boolean | null }[]) {
    if (s.active === false) continue;
    const k = `${s.instrument}:${s.version}`;
    itemCounts.set(k, (itemCounts.get(k) ?? 0) + 1);
  }

  const sessionCounts = new Map<string, number>();
  const tally = (instrument: string, rows: { instrument_version: number | null }[] | null) => {
    for (const r of rows ?? []) {
      const k = `${instrument}:${r.instrument_version ?? 1}`;
      sessionCounts.set(k, (sessionCounts.get(k) ?? 0) + 1);
    }
  };
  tally("pfa", (pfaSessions.data ?? []) as never);
  tally("sevenq", (sqSessions.data ?? []) as never);

  return ((versions.data ?? []) as never as VersionRow[]).map((v) => {
    const k = `${v.instrument}:${v.version}`;
    return {
      ...v,
      item_count: itemCounts.get(k) ?? 0,
      session_count: sessionCounts.get(k) ?? 0,
    };
  });
}

export type ItemDiff = {
  item_code: string | null;
  text_tr: string | null;
  changes: { field: string; from: string; to: string }[];
};

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "evet" : "hayır";
  return String(v);
}

export async function diffVersions(instrument: "pfa" | "sevenq", from: number, to: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cols = "question_id, item_code, level, capacity, text_tr, reverse_coded, is_pilot_only, active";
  const [a, b] = await Promise.all([
    supabaseAdmin.from("instrument_item_snapshots").select(cols).eq("instrument", instrument).eq("version", from),
    supabaseAdmin.from("instrument_item_snapshots").select(cols).eq("instrument", instrument).eq("version", to),
  ]);
  const left = new Map<string, SnapshotItem>();
  const right = new Map<string, SnapshotItem>();
  for (const r of (a.data ?? []) as never as SnapshotItem[]) left.set(r.question_id, r);
  for (const r of (b.data ?? []) as never as SnapshotItem[]) right.set(r.question_id, r);

  const added: ItemDiff[] = [];
  const removed: ItemDiff[] = [];
  const changed: ItemDiff[] = [];
  const fields: (keyof SnapshotItem)[] = ["text_tr", "level", "capacity", "reverse_coded", "is_pilot_only", "active"];

  for (const [id, r] of right) {
    const l = left.get(id);
    if (!l) {
      added.push({ item_code: r.item_code, text_tr: r.text_tr, changes: [] });
      continue;
    }
    const changes = fields
      .filter((f) => l[f] !== r[f])
      .map((f) => ({ field: String(f), from: fmt(l[f]), to: fmt(r[f]) }));
    if (changes.length) changed.push({ item_code: r.item_code, text_tr: r.text_tr, changes });
  }
  for (const [id, l] of left) {
    if (!right.has(id)) removed.push({ item_code: l.item_code, text_tr: l.text_tr, changes: [] });
  }

  return {
    from,
    to,
    counts: { from: left.size, to: right.size },
    added,
    removed,
    changed,
  };
}
