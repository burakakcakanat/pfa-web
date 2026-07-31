import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  CAPACITY_CODES,
  CAPACITY_LABEL,
  SEVENQ_BAND_LABEL,
  SEVENQ_LEVEL_LABEL,
  SEVENQ_LEVEL_SHORT,
  developmentSuggestion,
  lowestCells,
  sevenqBand,
  strongestLevel,
  weakestLevel,
  type SevenqCells,
} from "@/lib/sevenq-scoring";

type Props = {
  levelScores: Record<string, number>;
  capacityScores: Record<string, number> & { cells?: SevenqCells };
  totalScore: number;
  akort: number;
  awarenessScore: number;
};

function heatColor(score: number) {
  const opacity = Math.max(0.06, Math.min(0.9, score / 110));
  return `color-mix(in srgb, hsl(var(--accent)) ${Math.round(opacity * 100)}%, transparent)`;
}

export function SevenqResult({ levelScores, capacityScores, totalScore, akort, awarenessScore }: Props) {
  const cells = capacityScores.cells;
  const best = strongestLevel(levelScores);
  const low = weakestLevel(levelScores);
  const band = sevenqBand(totalScore);

  const radarData = CAPACITY_CODES.map((c) => ({
    capacity: CAPACITY_LABEL[c],
    score: capacityScores[c] ?? 0,
  }));

  const suggestions = lowestCells(cells, 3);

  return (
    <div className="space-y-12">
      <section className="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed text-foreground/80">
        <strong className="font-medium">Çerçeve notu:</strong> 7Q bir performans testi (doğru cevaplı bir IQ
        testi) değil, öz-bildirimli bir uygulama envanteridir. Profil bir karşılaştırma değil, aynadır.
        <div className="mt-2 text-xs text-muted-foreground">
          Bu sürüm pilot aşamasındadır; psikometrik geçerleme çalışması sürüyor.
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border-2 border-accent/40 bg-accent/5 p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">7Q Skoru</div>
          <div className="mt-2 font-serif text-5xl">
            {totalScore}
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <div className="mt-2 text-sm text-foreground/80">{SEVENQ_BAND_LABEL[band]}</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Yedi seviyenin eşit ağırlıklı ortalaması: meydan okumaları aşma pratiğinizin genel yoğunluğu.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">Akort</div>
          <div className="mt-2 font-serif text-5xl">
            {akort}
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent" style={{ width: `${akort}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Yüksek akort, seviyeler arasında dengeli bir profil; düşük akort, bazı seviyelerin diğerlerinden
            belirgin biçimde öne çıktığını gösterir.
          </p>
        </div>
      </section>

      <section>
        <h3 className="font-serif text-2xl">Yedi seviye profili</h3>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((lvl) => {
            const score = levelScores[`L${lvl}`] ?? 0;
            const isBest = lvl === best;
            const isLow = lvl === low;
            return (
              <div key={lvl} className="flex items-center gap-4">
                <div className={`w-40 shrink-0 text-xs ${isBest || isLow ? "text-accent" : "text-muted-foreground"}`}>
                  {SEVENQ_LEVEL_LABEL[lvl]}
                </div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${isBest ? "bg-accent" : isLow ? "bg-accent/50" : "bg-accent/30"}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="w-10 text-right font-serif text-sm">{score}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          En güçlü seviye: <strong className="text-foreground">{SEVENQ_LEVEL_SHORT[best]}</strong> · En düşük
          seviye: <strong className="text-foreground">{SEVENQ_LEVEL_SHORT[low]}</strong>
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 md:p-8">
        <h3 className="font-serif text-2xl">Beş kapasite</h3>
        <div className="mt-4 grid gap-6 md:grid-cols-2 md:items-center">
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="capacity" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar dataKey="score" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 text-sm">
            {CAPACITY_CODES.map((c) => (
              <li key={c} className="flex items-center justify-between border-b border-border/60 pb-1">
                <span>{CAPACITY_LABEL[c]}</span>
                <span className="font-serif text-lg">{capacityScores[c] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h3 className="font-serif text-2xl">Seviye × kapasite haritası</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-normal text-muted-foreground">Seviye</th>
                {CAPACITY_CODES.map((c) => (
                  <th key={c} className="p-2 text-center text-xs font-normal text-muted-foreground">
                    {CAPACITY_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }, (_, i) => i + 1).map((lvl) => (
                <tr key={lvl}>
                  <td className="p-2 text-xs text-muted-foreground">{SEVENQ_LEVEL_SHORT[lvl]}</td>
                  {CAPACITY_CODES.map((c) => {
                    const v = cells?.[`L${lvl}`]?.[c];
                    return (
                      <td key={c} className="p-1">
                        <div
                          className="flex h-10 items-center justify-center rounded border border-border/60 font-serif"
                          style={{ background: typeof v === "number" ? heatColor(v) : undefined }}
                        >
                          {typeof v === "number" ? v : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 md:p-8">
        <div className="text-xs uppercase tracking-[0.25em] text-accent">Farkındalık Göstergesi</div>
        <div className="mt-2 font-serif text-4xl">
          {awarenessScore}
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
        <p className="mt-3 text-sm text-foreground/80">
          Farkındalık kapıyı görür, irade kapıdan geçer: bu gösterge ne kadar gördüğünüzü söyler, geçişi ise
          seviye ve kapasite puanlarınız anlatır.
        </p>
      </section>

      <section>
        <h3 className="font-serif text-2xl">Üç gelişim önerisi</h3>
        <div className="mt-4 grid gap-4">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Öneri üretmek için yeterli veri yok.</p>
          ) : (
            suggestions.map((cell) => (
              <div
                key={`${cell.level}-${cell.capacity}`}
                className="rounded-lg border border-accent/40 bg-accent/5 p-5 text-sm text-foreground/80"
              >
                <div className="text-xs uppercase tracking-wider text-accent">
                  {SEVENQ_LEVEL_SHORT[cell.level]} · {CAPACITY_LABEL[cell.capacity]} · {cell.score}/100
                </div>
                <p className="mt-2">{developmentSuggestion(cell)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
