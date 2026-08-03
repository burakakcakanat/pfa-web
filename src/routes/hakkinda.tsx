import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hakkinda")({
  head: () => ({
    meta: [
      { title: "Hakkında — Burak Akçakanat | PFA" },
      {
        name: "description",
        content:
          "PFA modelinin yaratıcısı Burak Akçakanat: 2001'de başlayan ve yirmi üç yılı aşan bir bilinç araştırması.",
      },
      { property: "og:title", content: "Hakkında — Burak Akçakanat" },
      { property: "og:description", content: "PFA modelinin yaratıcısı Burak Akçakanat hakkında." },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/hakkinda" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/hakkinda" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Burak Akçakanat",
          jobTitle: "PFA modelinin yaratıcısı",
          description:
            "Psiko-Fonksiyonel Analiz (PFA) modelinin yaratıcısı; 2001'de başlayan, yirmi üç yılı aşan bir bilinç araştırması.",
          url: "https://psychofunctionalanalysis.com/hakkinda",
          worksFor: {
            "@type": "Organization",
            name: "Psiko-Fonksiyonel Analiz (PFA)",
            url: "https://psychofunctionalanalysis.com",
          },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Hakkında</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Burak Akçakanat</h1>
        <div className="mt-10 space-y-6 text-base leading-relaxed text-foreground/85">
          <p>
            PFA modeli, 2001 yılında yaşanan bir aydınlanma deneyiminden doğdu ve
            yirmi üç yılı aşkın bir çalışmayla olgunlaştı; psikoloji, nörobilim
            ve felsefeyi tek bir soruda buluşturdu: bilincin işlevleri tek bir
            harita üzerinde gösterilebilir mi?
          </p>
          <p>
            Aydınlanma bu haritada ulaşılamaz bir mucize değil, haritanın en uzak
            durağıdır — çünkü bir yerin haritası varsa, orada kaybolmak bir kader
            değildir. Önceki eseri <em>Human Consciousness Decoded</em> (2015)
            modelin köklerini oluşturur.
          </p>
        </div>
      </div>
    </div>
  );
}