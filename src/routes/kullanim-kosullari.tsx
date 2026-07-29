import { createFileRoute } from "@tanstack/react-router";

const URL = "https://psychofunctionalanalysis.com/kullanim-kosullari";

export const Route = createFileRoute("/kullanim-kosullari")({
  head: () => ({
    meta: [
      { title: "Kullanım Koşulları — PFA" },
      {
        name: "description",
        content:
          "PFA web sitesi ve dijital ürünlerinin kullanım koşulları: hesap sorumluluğu, dijital içerik lisansı, fikrî mülkiyet ve hizmet sürekliliği.",
      },
      { property: "og:title", content: "Kullanım Koşulları — PFA" },
      {
        property: "og:description",
        content: "PFA web sitesi ve dijital ürünlerinin kullanım koşulları.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://psychofunctionalanalysis.com/" },
            { "@type": "ListItem", position: 2, name: "Kullanım Koşulları", item: URL },
          ],
        }),
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Yasal</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Kullanım Koşulları</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 29 Temmuz 2026</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-foreground/85">
          <p>
            Bu koşullar, psychofunctionalanalysis.com adresinde sunulan içerik, hizmet ve
            dijital ürünlerin kullanımını düzenler. Siteyi kullanarak veya bir ürün satın
            alarak aşağıdaki koşulları kabul etmiş olursunuz.
          </p>

          <section>
            <h2 className="font-serif text-2xl text-primary">Hesap ve sorumluluk</h2>
            <p className="mt-3">
              Hesabınızın güvenliği size aittir; giriş bilgilerinizi paylaşmamanız ve
              hesabınız üzerinden yapılan işlemlerden sorumlu olduğunuzu bilmeniz gerekir.
              Verdiğiniz bilgilerin doğru ve güncel olması, siparişlerin ve dijital
              teslimatların size ulaşabilmesi için gereklidir. Hesabınızda yetkisiz bir
              kullanım fark ederseniz lütfen bize yazın.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">Dijital içerik lisansı</h2>
            <p className="mt-3">
              Satın aldığınız e-kitaplar, PFA Ölçeği raporları, webinar kayıtları ve benzeri
              dijital içerikler size kişisel, devredilemez ve münhasır olmayan bir kullanım
              lisansı sağlar. Bu içerikler kopyalanamaz, çoğaltılamaz, yeniden satılamaz,
              kamuya açık platformlarda paylaşılamaz veya üçüncü kişilere aktarılamaz.
              İsme imzalı nüshalar alıcıya özel olarak kişiselleştirilir; hediye akışı
              dışında başka bir kişiye devredilemez.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">Fikrî mülkiyet</h2>
            <p className="mt-3">
              Psiko-Fonksiyonel Analiz modeli, yedi seviyeli harita, 7Q çerçevesi, PFA
              Ölçeği soru havuzu ve raporlama metinleri, kitap metinleri, görseller ve
              site içeriği Burak Akçakanat'a aittir ve telif hakkı ile korunur. Kaynak
              göstererek kısa alıntı yapabilirsiniz; bunun ötesindeki kullanım için yazılı
              izin gerekir.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">Hizmetin sunumu</h2>
            <p className="mt-3">
              Site ve dijital hizmetler "olduğu gibi" sunulur. Bakım, teknik arıza veya
              üçüncü taraf servis kesintileri nedeniyle erişimde geçici aksamalar
              yaşanabilir; kesintisiz erişim garanti edilmez. İçerik ve fiyatlar önceden
              bildirilmeksizin güncellenebilir; satın alma anındaki koşullar sizin için
              geçerlidir.
            </p>
            <p className="mt-3">
              PFA içerikleri, ölçek sonuçları ve danışmanlık oturumları eğitsel ve gelişimsel
              amaçlıdır; tıbbi teşhis, tedavi veya psikiyatrik hizmet yerine geçmez.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">İletişim</h2>
            <p className="mt-3">
              Bu koşullarla ilgili sorularınız için{" "}
              <a className="text-accent hover:underline" href="mailto:info@psychofunctionalanalysis.com">
                info@psychofunctionalanalysis.com
              </a>{" "}
              adresine yazabilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
