import { useServerFn } from "@tanstack/react-start";
import { Fragment, useCallback, useEffect, useState } from "react";
import { LEVEL_LABEL_TR } from "@/lib/assessment-scoring";
import {
  getAnonItemStats,
  getAnonSessionAnswers,
  getDirectAssessmentDetail,
  listAnonSessions,
  listDirectAssessmentSessions,
  type AnonSessionRow,
  type AnswerDetailRow,
  type DirectSessionRow,
} from "@/lib/scale-data.functions";
import type { ItemStat, LevelStat } from "@/lib/scale-stats";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";

function LevelScores({ scores }: { scores: Record<string, number> | null }) {
  if (!scores) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {Array.from({ length: 7 }, (_, i) => `L${i + 1}`).map((k) => (
        <span key={k} className="rounded border border-border px-1.5 py-0.5 text-[11px]">
          {k}:{scores[k] ?? "—"}
        </span>
      ))}
    </span>
  );
}

function AnswerTable({ rows }: { rows: AnswerDetailRow[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr className="border-b border-border text-left">
          <th className="py-1.5 pr-2">Seviye</th>
          <th className="py-1.5 pr-2">Sıra</th>
          <th className="py-1.5 pr-2">Madde (TR)</th>
          <th className="py-1.5 pr-2">Ters</th>
          <th className="py-1.5 pr-2">Ham</th>
          <th className="py-1.5">Çevrilmiş</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, i) => (
          <tr key={`${a.level}-${a.sort_order}-${i}`} className="border-b border-border/50">
            <td className="py-1.5 pr-2 whitespace-nowrap">
              L{a.level} · {LEVEL_LABEL_TR[a.level] ?? "—"}
            </td>
            <td className="py-1.5 pr-2">{a.sort_order}</td>
            <td className="py-1.5 pr-2">{a.text_tr}</td>
            <td className="py-1.5 pr-2">{a.reverse_coded ? "Evet" : "—"}</td>
            <td className="py-1.5 pr-2">{a.raw}</td>
            <td className="py-1.5">{a.coded}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DirectSection() {
  const list = useServerFn(listDirectAssessmentSessions);
  const detailFn = useServerFn(getDirectAssessmentDetail);
  const [rows, setRows] = useState<DirectSessionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof detailFn>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    list()
      .then((r) => setRows(r as DirectSessionRow[]))
      .catch((e) => setErr(e?.message ?? "Yüklenemedi."));
  }, [list]);

  const open = useCallback(
    async (id: string) => {
      if (openId === id) {
        setOpenId(null);
        setDetail(null);
        return;
      }
      setOpenId(id);
      setDetail(null);
      try {
        setDetail(await detailFn({ data: { session_id: id } }));
      } catch (e: any) {
        setErr(e?.message ?? "Detay yüklenemedi.");
      }
    },
    [detailFn, openId],
  );

  if (err) return <p className="text-sm text-destructive">{err}</p>;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Doğrudan katılımcılar</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Uygulayıcı daveti olmadan siteden gelen oturumlar. {rows.length} kayıt.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2">Tarih</th>
              <th className="px-2 py-2">Kullanıcı</th>
              <th className="px-2 py-2">E-posta</th>
              <th className="px-2 py-2">Tip</th>
              <th className="px-2 py-2">Dil</th>
              <th className="px-2 py-2">Durum</th>
              <th className="px-2 py-2">Onam</th>
              <th className="px-2 py-2">Seviye skorları</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <Fragment key={s.id}>
                <tr
                  onClick={() => open(s.id)}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/40"
                >
                  <td className="px-4 py-2 whitespace-nowrap">{fmtDate(s.completed_at ?? s.created_at)}</td>
                  <td className="px-2 py-2">{s.full_name ?? "—"}</td>
                  <td className="px-2 py-2">{s.email ?? "—"}</td>
                  <td className="px-2 py-2">{s.type === "full" ? "Tam" : "Mini"}</td>
                  <td className="px-2 py-2 uppercase">{s.locale}</td>
                  <td className="px-2 py-2">{s.status === "completed" ? "Tamamlandı" : "Devam"}</td>
                  <td className="px-2 py-2">{s.research_consent ? "Var" : "Yok"}</td>
                  <td className="px-2 py-2"><LevelScores scores={s.level_scores} /></td>
                </tr>
                {openId === s.id ? (
                  <tr className="border-b border-border bg-muted/20">
                    <td colSpan={8} className="px-4 py-4">
                      {!detail ? (
                        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
                      ) : (
                        <div className="space-y-3">
                          <AnswerTable rows={detail.answers} />
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div>
                              <div className="text-muted-foreground">Seviye skorları</div>
                              <LevelScores scores={detail.level_scores} />
                            </div>
                            <div>
                              <div className="text-muted-foreground">Bant özeti</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(detail.summary_band ?? {}).map(([k, v]) => (
                                  <span key={k} className="rounded border border-border px-1.5 py-0.5">
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemStatsView() {
  const fn = useServerFn(getAnonItemStats);
  const [data, setData] = useState<{ items: ItemStat[]; levels: LevelStat[]; sessions: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fn()
      .then((d) => setData(d as any))
      .catch((e) => setErr(e?.message ?? "Yüklenemedi."));
  }, [fn]);

  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (!data.items.length)
    return (
      <p className="text-sm text-muted-foreground">
        Rıza verilmiş danışan oturumu bulunmuyor; gösterilecek veri yok.
      </p>
    );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {data.sessions} anonim oturum (yalnızca araştırma rızası verenler).
      </p>
      <div className="flex flex-wrap gap-2">
        {data.levels.map((l) => (
          <div key={l.level} className="rounded border border-border px-3 py-2 text-xs">
            <div className="font-medium">L{l.level} · {LEVEL_LABEL_TR[l.level] ?? ""}</div>
            <div className="text-muted-foreground">
              N={l.n} · madde={l.items} · α={l.alpha ?? "—"}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-left">
              <th className="px-3 py-2">Kod</th>
              <th className="px-2 py-2">Sev.</th>
              <th className="px-2 py-2">Madde</th>
              <th className="px-2 py-2">N</th>
              <th className="px-2 py-2">Ort.</th>
              <th className="px-2 py-2">SS</th>
              <th className="px-2 py-2">Dağılım (1–5)</th>
              <th className="px-2 py-2">Madde-toplam r</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.question_id} className="border-b border-border/50">
                <td className="px-3 py-2 whitespace-nowrap">{it.item_code ?? "—"}</td>
                <td className="px-2 py-2">L{it.level}</td>
                <td className="px-2 py-2">
                  {it.text}
                  {it.reverse_coded ? <span className="ml-1 text-muted-foreground">(ters)</span> : null}
                </td>
                <td className="px-2 py-2">{it.n}</td>
                <td className="px-2 py-2">{it.mean}</td>
                <td className="px-2 py-2">{it.sd}</td>
                <td className="px-2 py-2 whitespace-nowrap">{it.dist.join(" / ")}</td>
                <td className="px-2 py-2">
                  {it.itemTotal ?? "—"}
                  {it.lowDiscrimination ? (
                    <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">
                      düşük
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnonSessionsView() {
  const list = useServerFn(listAnonSessions);
  const detailFn = useServerFn(getAnonSessionAnswers);
  const [rows, setRows] = useState<AnonSessionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerDetailRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    list()
      .then((r) => setRows(r as AnonSessionRow[]))
      .catch((e) => setErr(e?.message ?? "Yüklenemedi."));
  }, [list]);

  async function open(rid: string) {
    if (openId === rid) {
      setOpenId(null);
      setAnswers(null);
      return;
    }
    setOpenId(rid);
    setAnswers(null);
    try {
      setAnswers((await detailFn({ data: { research_id: rid } })) as AnswerDetailRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "Detay yüklenemedi.");
    }
  }

  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">Rıza verilmiş danışan oturumu yok.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border text-left">
            <th className="px-3 py-2">Takma ad</th>
            <th className="px-2 py-2">Sürüm</th>
            <th className="px-2 py-2">Tip</th>
            <th className="px-2 py-2">Ay</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <Fragment key={s.research_id}>
              <tr
                onClick={() => open(s.research_id)}
                className="cursor-pointer border-b border-border/50 hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono">{s.research_id.slice(0, 8)}</td>
                <td className="px-2 py-2">v{s.instrument_version}</td>
                <td className="px-2 py-2">{s.session_type === "full" ? "Tam" : "Mini"}</td>
                <td className="px-2 py-2">{s.month}</td>
              </tr>
              {openId === s.research_id ? (
                <tr className="border-b border-border bg-muted/20">
                  <td colSpan={4} className="px-3 py-4">
                    {!answers ? (
                      <p className="text-xs text-muted-foreground">Yükleniyor…</p>
                    ) : (
                      <AnswerTable rows={answers} />
                    )}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminScaleData() {
  const [view, setView] = useState<"stats" | "sessions">("stats");
  return (
    <div className="space-y-6">
      <DirectSection />

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium">Uygulayıcı danışanları — anonim</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Yalnızca araştırma rızası verilmiş oturumlar. Danışan, uygulayıcı ve davet bilgisi
            gösterilmez; oturumlar takma ad ile listelenir ve tarihler ay düzeyindedir.
          </p>
          <div className="mt-3 flex gap-2">
            {(
              [
                ["stats", "Madde istatistikleri"],
                ["sessions", "Anonim oturum incele"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  view === k ? "border-accent bg-accent/10 text-accent" : "border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">{view === "stats" ? <ItemStatsView /> : <AnonSessionsView />}</div>
      </div>
    </div>
  );
}
