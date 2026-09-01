import { createFileRoute, Link } from "@tanstack/react-router";
import { SevenQCards } from "@/components/seven-q-cards";

export const Route = createFileRoute("/7q/")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } =>
    typeof search.invite === "string" ? { invite: search.invite } : {},
  head: () => ({
    meta: [
      { title: "7Q Profili | Yedi Seviyede Kapasite Envanteri" },
      {
        name: "description",
        content:
          "7Q Profili: yedi bilinç seviyesinin meydan okumalarını aşma kapasitenizi ölçen öz-bildirimli uygulama envanteri. PFA Ölçeği'nden ayrı, kendi raporuyla.",
      },
      { property: "og:title", content: "7Q Profili — Kapasite Envanteri" },
      {
        property: "og:description",
        content: "Yedi seviyede kapasite profili, beş kapasite radarı ve akort göstergesi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/7q" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/7q" }],
  }),
  component: SevenqIntro,
});

function SevenqIntro() {
  const { invite } = Route.useSearch();

  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">7Q PROFİLİ</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          Meydan okumaları aşma kapasiteniz
        </h1>
        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          7Q, yedi bilinç seviyesinin her birinde günlük yaşamınıza hangi pratiklerin yerleştiğini gösteren
          öz-bildirimli bir uygulama envanteridir. Beş kapasite — Ustalık, Yaratıcılık, Dirayet, İrade,
          Rutin — yedi seviye boyunca izlenir; sonuç bir sıralama değil, bir aynadır.
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-3xl rounded-lg border-2 border-accent/40 bg-accent/5 p-6 text-center text-sm text-foreground/80">
        <strong className="font-medium">PFA Ölçeği'nden farkı:</strong> Ölçek "hangi seviyede işlev aksaması
        var?" sorusunu sorar; 7Q "her seviyenin meydan okumalarını aşma kapasiten ne?" sorusunu sorar.
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
        <InfoCard title="Kaç madde?" body="Pilot form 75 madde: L1–L5 onar, L6 on iki (3a/3b ve 9a/9b bölünmüş biçimde test ediliyor), L7 on üç (üç yedek aday dâhil). Seviye seviye gruplanır; her ekranda bir seviye." />
        <InfoCard title="Ne kadar sürer?" body="Yaklaşık 15–20 dakika. Yanıtlar anında kaydedilir; yarıda bırakıp dönebilirsiniz." />
        <InfoCard title="Ne çıkar?" body="7Q skoru ve akort göstergesi, yedi seviye profili, beş kapasite radarı, seviye × kapasite haritası ve üç gelişim önerisi." />
      </div>

      <div className="mx-auto mt-12 max-w-4xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">YEDİ ZEKÂ</div>
        <SevenQCards locale="tr" />
      </div>



      <div className="mx-auto mt-12 max-w-3xl text-center">
        <Link to="/7q/form" search={{ invite }} className="btn-primary inline-block">
          Başla
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Pilot dönemde giriş yapmış tüm üyeler için ücretsizdir. Giriş yapmadıysanız üyelik ekranına
          yönlendirilirsiniz.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Ölçek akışını arıyorsanız:{" "}
          <Link to="/degerlendirme" className="text-accent hover:underline">
            PFA Ölçeği →
          </Link>
        </p>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-serif text-xl">{title}</h2>
      <p className="mt-2 text-sm text-foreground/80">{body}</p>
    </div>
  );
}
