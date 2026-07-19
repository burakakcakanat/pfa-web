import { createFileRoute } from "@tanstack/react-router";
import { BuyButton } from "@/components/buy-button";

export const Route = createFileRoute("/webinarlar/pfa-pro")({
  head: () => ({
    meta: [
      { title: "PFA-Pro Uygulayıcı Lisans Paketi — PFA" },
      {
        name: "description",
        content:
          "Terapist, koç, eğitimci ve İK profesyonelleri için PFA uygulayıcı lisans paketi: eğitim + sertifika + Pro panel.",
      },
    ],
  }),
  component: Page,
});

const ICERIK = [
  "6 canlı online eğitim oturumu (kuramsal temel; yedi seviyenin işlevleri ve nedensellikleri; PA Ölçeği uygulama ve rapor yorumlama; vaka çalışması; uygulama etiği ve sınırlar).",
  "PFA Applier/Practitioner unvanı ve dijital sertifika (PDF, Hesabım'a düşer).",
  "Portal Pro hesabı: \"Danışanlarım\" paneli.",
  "20 danışan ölçeği hakkı (danışanlarınıza ücretsiz tam PA Ölçeği tanımlama).",
  "Pro materyal alanı (uygulama kılavuzları).",
];

function Page() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">
          Profesyonel Uygulama İçin
        </div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          PFA-Pro — Uygulayıcı Lisans Paketi
        </h1>
        <p className="mt-3 font-serif text-xl italic text-foreground/70">
          PFA'yı danışanlarınızla uygulamak için eğitim + lisans + araçlar.
        </p>

        <p className="mt-8 leading-relaxed text-foreground/85">
          Terapist, koç, eğitimci ve İK profesyonelleri için: modeli kuramsal temeliyle
          öğrenin, PA Ölçeği'ni danışanlarınıza uygulayın, raporları tek panelden yönetin.
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

        <div className="mt-10 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card p-6">
          <div className="font-serif text-4xl">$450</div>
          <BuyButton productSlug="pfa-pro-lisans-paketi" label="Kayıt Ol" />
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Not: PFA klinik bir tanı sistemi değildir; sertifika, PFA modelinin uygulama
          eğitiminin tamamlandığını belgeler.
        </p>
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
