import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSevenQImageUrls } from "@/lib/seven-q-media.functions";
import { SEVEN_Q_VISUALS } from "@/lib/seven-q-visuals";

/**
 * Yedi zekânın illüstrasyonlu kart şeridi. Görseller medya kütüphanesinden
 * dosya adıyla çözülür; yüklenmemiş dosyada kırık görsel yerine yalnız metin
 * kartı gösterilir.
 */
export function SevenQCards({ locale = "tr" }: { locale?: "tr" | "en" }) {
  const fetchUrls = useServerFn(getSevenQImageUrls);
  const { data } = useQuery({
    queryKey: ["seven-q-images"],
    queryFn: () => fetchUrls(),
    staleTime: 5 * 60 * 1000,
  });
  const urls = data ?? {};

  return (
    <ol className="mt-8 flex flex-wrap justify-center gap-3">
      {SEVEN_Q_VISUALS.map((v) => {
        const url = urls[v.filename];
        const name = locale === "en" ? v.en : v.tr;
        return (
          <li
            key={v.code}
            className="group flex w-[calc(50%-0.375rem)] flex-col items-center justify-start rounded-lg border border-border/70 bg-illustration-surface px-3 py-4 text-center text-illustration-surface-foreground shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_8px_22px_-14px_rgba(0,0,0,0.3)] sm:w-[calc(25%-0.5625rem)]"
          >
            <span className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-accent/80">
              L{v.level}
              <span className="inline-block h-px w-4 bg-accent/40" />
              {v.code}
            </span>
            {url ? (
              <img
                src={url}
                alt={`${v.code} — ${name}`}
                width={640}
                height={640}
                loading="lazy"
                decoding="async"
                className="mt-3 block h-auto w-full max-w-[160px] object-contain"
              />
            ) : null}
            <span className="mt-3 text-[0.78rem] font-medium leading-tight">{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
