import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  BAND_COPY,
  BAND_LABEL,
  INTELLIGENCE_LABEL,
  LEVEL_LABEL_TR,
  LEVEL_TO_INTELLIGENCE,
  bandFor,
  lowestTwoLevels,
} from "@/lib/assessment-scoring";

type Props = {
  levelScores: Record<string, number>;
  intelligenceScores: Record<string, number>;
  variant: "mini" | "full";
};

export function AssessmentResult({ levelScores, intelligenceScores, variant }: Props) {
  const radarData = Array.from({ length: 7 }, (_, i) => {
    const lvl = i + 1;
    return {
      level: `L${lvl}`,
      score: levelScores[`L${lvl}`] ?? 0,
    };
  });

  const lowest = lowestTwoLevels(levelScores);

  const summaryScore = Math.round(
    Object.values(levelScores).reduce((s, x) => s + x, 0) / 7,
  );
  const overallBand = bandFor(summaryScore);

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-border bg-card p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="level" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar dataKey="score" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-accent">Genel Görünüm</div>
            <h2 className="mt-2 font-serif text-3xl">Ortalama skor: {summaryScore}/100</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              Yedi bilinç seviyesi genelinde işlevsel farkındalığınız <strong>{BAND_LABEL[overallBand].toLocaleLowerCase("tr-TR")}</strong> bandında görünüyor.
              Aşağıdaki radar, her seviyenin kendi ölçeğinde ne kadar dengeli kullanıldığını gösterir.
              Yüksek skor "iyi", düşük skor "kötü" değildir; hangi seviyenin destek almaya açık olduğunu ve
              hangisinin şu an güçlü zemin sağladığını gösterir.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-serif text-2xl">Destek alınacak seviyeler</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          En düşük iki seviye — gelişim çalışmasının en çok fark yaratacağı alanlar.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {lowest.map((lvl) => {
            const score = levelScores[`L${lvl}`] ?? 0;
            const b = bandFor(score);
            return (
              <div key={lvl} className="rounded-lg border border-accent/40 bg-accent/5 p-5">
                <div className="text-xs uppercase tracking-wider text-accent">{LEVEL_LABEL_TR[lvl]}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="font-serif text-3xl">{score}<span className="text-lg text-muted-foreground">/100</span></div>
                  <div className="text-xs text-muted-foreground">{BAND_LABEL[b]}</div>
                </div>
                <p className="mt-3 text-sm text-foreground/80">{BAND_COPY[b]}</p>
              </div>
            );
          })}
        </div>
      </section>

      {variant === "full" && (
        <>
          <section>
            <h3 className="font-serif text-2xl">Seviye seviye görünüm</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 7 }, (_, i) => i + 1).map((lvl) => {
                const score = levelScores[`L${lvl}`] ?? 0;
                const b = bandFor(score);
                return (
                  <div key={lvl} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-baseline justify-between">
                      <div className="text-xs uppercase tracking-wider text-accent">{LEVEL_LABEL_TR[lvl]}</div>
                      <div className="text-xs text-muted-foreground">{BAND_LABEL[b]}</div>
                    </div>
                    <div className="mt-2 font-serif text-2xl">{score}<span className="text-lg text-muted-foreground">/100</span></div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-accent" style={{ width: `${score}%` }} />
                    </div>
                    <p className="mt-3 text-sm text-foreground/80">{BAND_COPY[b]}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="font-serif text-2xl">Zeka türleri</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Her seviye bir zeka türüne karşılık gelir. Skorlar seviyelerle aynı ölçekte gösterilir.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => i + 1).map((lvl) => {
                const key = LEVEL_TO_INTELLIGENCE[lvl];
                const score = intelligenceScores[key] ?? 0;
                return (
                  <div key={key} className="rounded-md border border-border bg-card p-3 text-center">
                    <div className="text-xs text-muted-foreground">{INTELLIGENCE_LABEL[key]}</div>
                    <div className="mt-1 font-serif text-2xl">{score}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Bu değerlendirme klinik bir tanı aracı değildir; işlevsel farkındalık için bir gelişim aracıdır.
      </p>
    </div>
  );
}