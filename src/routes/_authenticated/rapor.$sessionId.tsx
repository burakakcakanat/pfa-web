import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentResult } from "@/components/assessment-result";
import { BuyButton } from "@/components/buy-button";

export const Route = createFileRoute("/_authenticated/rapor/$sessionId")({
  head: () => ({
    meta: [
      { title: "Değerlendirme Raporu — PFA" },
      { name: "description", content: "PFA değerlendirme raporunuz: yedi bilinç seviyesinde işlevsel farkındalık haritanız." },
    ],
  }),
  component: ReportPage,
});

type Session = { id: string; type: "mini" | "full"; created_at: string; completed_at: string | null; user_id: string | null };
type Result = {
  level_scores: Record<string, number>;
  intelligence_scores: Record<string, number>;
};

function ReportPage() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s, error: sErr }, { data: r, error: rErr }, { data: userRes }] = await Promise.all([
        supabase.from("assessment_sessions").select("id, type, created_at, completed_at, user_id").eq("id", sessionId).maybeSingle(),
        supabase.from("assessment_results").select("level_scores, intelligence_scores").eq("session_id", sessionId).maybeSingle(),
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
          {!isOwner ? "Danışan Raporu · " : ""}
          {session.type === "mini" ? "Mini Değerlendirme Sonucu" : "Tam Ölçek Raporu"}
        </div>
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">Bilinç Seviyeleri Haritanız</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(session.completed_at ?? session.created_at).toLocaleString("tr-TR")}
        </p>
      </header>

      <div className="mx-auto max-w-4xl">
        <AssessmentResult
          levelScores={result.level_scores}
          intelligenceScores={result.intelligence_scores}
          variant={session.type}
        />

        {session.type === "mini" && isOwner && (
          <div className="mt-12 rounded-lg border-2 border-accent/50 bg-accent/5 p-8 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-accent">Bir Adım Daha</div>
            <h3 className="mt-3 font-serif text-2xl md:text-3xl">Tam Assessment + Bilinç Seviyesi Raporu</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/80">
              Genişletilmiş soru bankası, her seviye için ayrıntılı yorum, zeka türü skorları ve destek alınacak alanların derinlemesine haritası.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="font-serif text-3xl">$29</span>
              <BuyButton productSlug="tam-assessment-rapor" label="Tam Assessment Satın Al" />
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/hesabim" className="text-sm text-accent hover:underline">← Hesabıma dön</Link>
        </div>
      </div>
    </div>
  );
}