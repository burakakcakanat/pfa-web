import { createFileRoute } from "@tanstack/react-router";

const URL = "https://psychofunctionalanalysis.com/iade-politikasi";

export const Route = createFileRoute("/iade-politikasi")({
  head: () => ({
    meta: [
      { title: "İade Politikası — PFA" },
      {
        name: "description",
        content:
          "PFA dijital ürünleri için iade koşulları: 14 günlük cayma hakkı, istisnalar ve iade süreci.",
      },
      { property: "og:title", content: "İade Politikası — PFA" },
      {
        property: "og:description",
        content: "PFA dijital ürünleri için iade koşulları.",
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
            { "@type": "ListItem", position: 2, name: "İade Politikası", item: URL },
          ],
        }),
      },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Yasal</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">İade Politikası</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 29 Temmuz 2026</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-foreground/85">
          <p>
            Aldığınız üründen memnun kalmanız bizim için önemli. Aşağıdaki koşullar hem
            sizin hakkınızı hem de dijital içeriğin doğasını gözeterek düzenlenmiştir.
          </p>

          <section>
            <h2 className="font-serif text-2xl text-primary">14 günlük iade hakkı</h2>
            <p className="mt-3">
              Dijital ürünlerde satın alma tarihinden itibaren 14 gün içinde iade talep
              edebilirsiniz. Bu süre; e-kitaplar, PFA Ölçeği tam rapor hakkı, webinar
              erişimleri ve PFA-Pro lisans paketleri için geçerlidir.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">İadenin kapsam dışı kaldığı durumlar</h2>
            <p className="mt-3">
              Dijital içerik tüketildiğinde iade hakkı sona erer. Bu, açıkça şu anlama gelir:
              PFA Ölçeği raporunuz oluşturulduysa, PFA-Pro danışan kredilerinizin bir kısmı
              kullanıldıysa ya da e-kitabınız görüntülendiyse veya indirildiyse, ilgili ürün
              iade kapsamı dışına çıkar. Kısmen kullanılmış paketlerde, kullanılmamış
              bileşenler için orantılı iade değerlendirilebilir. Kullanmadığınız bir üründe
              teknik bir sorun yaşadıysanız, iade yerine önce çözüm üretmeye çalışırız.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">Teslimat</h2>
            <p className="mt-3">
              Bütün ürünler dijitaldir. E-kitaplar ve dijital haklar ödeme onaylandığı anda
              hesabınıza tanımlanır ve{" "}
              <span className="whitespace-nowrap">/hesabim</span> sayfanızdan erişilebilir
              hâle gelir; beklemeniz gereken bir teslim süreci yoktur.
            </p>
            <p className="mt-3">
              İsme imzalı nüsha da dijitaldir: adınıza kişiselleştirilmiş bir PDF olarak
              hazırlanır ve hesabınızdan okunabilir veya indirilebilir.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-primary">İade talebi ve geri ödeme</h2>
            <p className="mt-3">
              İade taleplerinizi sipariş numaranızla birlikte{" "}
              <a className="text-accent hover:underline" href="mailto:info@psychofunctionalanalysis.com">
                info@psychofunctionalanalysis.com
              </a>{" "}
              adresine iletebilirsiniz. Talebinizi genellikle 3 iş günü içinde
              değerlendiririz. Onaylanan iadeler, ödemenin yapıldığı yönteme geri
              aktarılır; tutarın hesabınıza yansıması bankanıza bağlı olarak birkaç iş günü
              sürebilir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
