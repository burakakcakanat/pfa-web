import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SevenqResult } from "@/components/sevenq-result";
import type { SevenqCells } from "@/lib/sevenq-scoring";

export const Route = createFileRoute("/_authenticated/7q/rapor/$sessionId")({
  head: () => ({
    meta: [
      { title: "7Q Profili Raporu — PFA" },
      { name: "description", content: "7Q Profili raporunuz: yedi seviyede kapasite profili, akort ve gelişim önerileri." },
    ],
  }),
  component: SevenqReportPage,
});

type Session = { id: string; created_at: string; completed_at: string | null; user_id: string | null };
type Result = {
  level_scores: Record<string, number>;
  capacity_scores: Record<string, number> & { cells?: SevenqCells };
  total_score: number;
  akort: number;
  awareness_score: number;
};

function SevenqReportPage() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: s, error: sErr }, { data: r, error: rErr }, { data: userRes }] = await Promise.all([
        supabase.from("sevenq_sessions").select("id, created_at, completed_at, user_id").eq("id", sessionId).maybeSingle(),
        supabase
          .from("sevenq_results")
          .select("level_scores, capacity_scores, total_score, akort, awareness_score")
          .eq("session_id", sessionId)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (sErr || rErr) {
        setError(sErr?.message || rErr?.message || "Yükleme hatası");
        return;
      }
      if (!s || !r) {
        setError("Rapor bulunamadı veya bu rapora erişim yetkiniz yok.");
        return;
      }
      setSession(s as Session);
      setIsOwner(!!userRes?.user?.id && (s as Session).user_id === userRes.user.id);
      setResult(r as unknown as Result);
    })();
  }, [sessionId]);

  if (error) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link to="/hesabim" className="mt-4 inline-block text-accent">Hesabıma dön</Link>
      </div>
    );
  }
  if (!session || !result) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  return (
    <div className="container-page py-16">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">
          {!isOwner ? "Danışan Raporu · " : ""}7Q Profili
        </div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">Kapasite Profiliniz</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(session.completed_at ?? session.created_at).toLocaleString("tr-TR")}
        </p>
      </header>

      <div className="mx-auto max-w-4xl">
        <SevenqResult
          levelScores={result.level_scores}
          capacityScores={result.capacity_scores}
          totalScore={result.total_score}
          akort={result.akort}
          awarenessScore={result.awareness_score}
        />
        <div className="mt-10 text-center">
          <Link to="/hesabim" className="text-sm text-accent hover:underline">← Hesabıma dön</Link>
        </div>
      </div>
    </div>
  );
}
