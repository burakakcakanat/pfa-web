import { createFileRoute } from "@tanstack/react-router";
import { BuyButton } from "@/components/buy-button";
import { getUpcomingWebinarForProduct } from "@/lib/site-settings.functions";
import { formatWebinarPrice } from "@/lib/social-drafts";
import {
  WebinarBanner,
  WebinarShowcaseStrip,
  OtherWebinarsLink,
} from "@/components/webinar-showcase";

export const Route = createFileRoute("/webinarlar/pfa-pro")({
  loader: () => getUpcomingWebinarForProduct({ data: { slug: "pfa-pro-lisans-paketi" } }),
  head: () => ({
    meta: [
      { title: "PFA-Pro Uygulayıcı Lisans Paketi — PFA" },
      {
        name: "description",
        content:
          "Terapist, koç, eğitimci ve İK profesyonelleri için PFA uygulayıcı lisans paketi: eğitim + sertifika + Pro panel.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          name: "PFA-Pro Uygulayıcı Lisans Paketi",
          description:
            "Terapist, koç, eğitimci ve İK profesyonelleri için PFA uygulayıcı lisans paketi: 6 canlı online eğitim oturumu, sertifika ve Pro panel.",
          url: "https://psychofunctionalanalysis.com/webinarlar/pfa-pro",
          inLanguage: "tr",
          provider: {
            "@type": "Organization",
            name: "Psiko-Fonksiyonel Analiz (PFA)",
            url: "https://psychofunctionalanalysis.com",
          },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "PT6H",
          },
        }),
      },
    ],
  }),
  component: Page,
});

const ICERIK = [
  "6 canlı online eğitim oturumu (kuramsal temel; yedi seviyenin işlevleri ve nedensellikleri; PFA Ölçeği uygulama ve rapor yorumlama; vaka çalışması; uygulama etiği ve sınırlar).",
  "PFA Applier/Practitioner unvanı ve dijital sertifika (PDF, Hesabım'a düşer).",
  "Portal Pro hesabı: \"Danışanlarım\" paneli.",
  "20 danışan ölçeği hakkı (danışanlarınıza ücretsiz tam PFA Ölçeği tanımlama).",
  "Pro materyal alanı (uygulama kılavuzları).",
];

function Page() {
  const loaded = Route.useLoaderData() as {
    session: {
      id: string;
      title: string;
      starts_at: string;
      banner_url: string | null;
      target_vertical?: string | null;
    } | null;
    price_cents: number | null;
  };
  const session = loaded?.session ?? null;
  const priceLabel = formatWebinarPrice(loaded?.price_cents);
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <WebinarBanner session={session} />
        <WebinarShowcaseStrip session={session} />
        <div className="text-xs tracking-[0.3em] text-accent">
          PROFESYONEL UYGULAMA İÇİN
        </div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          PFA-Pro — Uygulayıcı Lisans Paketi
        </h1>
        <p className="mt-3 font-serif text-xl italic text-foreground/70">
          PFA'yı danışanlarınızla uygulamak için eğitim + lisans + araçlar.
        </p>

        <p className="mt-8 leading-relaxed text-foreground/85">
          Terapist, koç, eğitimci ve İK profesyonelleri için: modeli kuramsal temeliyle
          öğrenin, PFA Ölçeği'ni danışanlarınıza uygulayın, raporları tek panelden yönetin.
        </p>

        <Section title="Paket içeriği">
          <ul className="list-disc space-y-2 pl-5 text-foreground/85">
            {ICERIK.map((k) => <li key={k}>{k}</li>)}
          </ul>
        </Section>

        <Section title="Danışan akışı nasıl işler">
          <p className="text-foreground/85">
            Panelden benzersiz bağlantı oluşturursunuz → danışanınız ölçeği çözer → rapor
            hem danışana hem sizin panelinize düşer.
          </p>
        </Section>

        <Section title="Ek hak">
          <p className="text-foreground/85">
            Ölçek hakkınız bittiğinde{" "}
            <span className="font-medium">"Danışan Ölçeği Ek Paketi (10)"</span> satın alabilirsiniz.
          </p>
        </Section>

        <div className="mt-10 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="font-serif text-4xl">{priceLabel}</div>
            <BuyButton
              productSlug="pfa-pro-lisans-paketi"
              label="Kayıt Ol"
              inquiry={{
                kind: "pro_license",
                productLabel: "PFA Uygulayıcı Lisansı",
              }}
            />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Bu bedel lisans kayıt bedelidir; 6 oturum ve sertifika, kayıt sonrasında
            erişime açılan hazırlık materyalinin parçasıdır.
          </p>
        </div>


        <p className="mt-8 text-xs text-muted-foreground">
          Not: PFA klinik bir tanı sistemi değildir; sertifika, PFA modelinin uygulama
          eğitiminin tamamlandığını belgeler.
        </p>
        <div><OtherWebinarsLink /></div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
