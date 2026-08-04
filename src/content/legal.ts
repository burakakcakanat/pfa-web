// Legal page copy, consolidated per page with tr/en keys.
// The Turkish text is the authoritative source; the English text is a faithful
// translation of it — no new clauses, no added scope.
export type LegalSection = { h2: string; paras: string[] };
export type LegalCopy = {
  eyebrow: string;
  h1: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const REFUND_COPY: Record<"tr" | "en", LegalCopy> = {
  tr: {
    eyebrow: "Yasal",
    h1: "İade Politikası",
    updated: "Son güncelleme: 29 Temmuz 2026",
    intro:
      "Aldığınız üründen memnun kalmanız bizim için önemli. Aşağıdaki koşullar hem sizin hakkınızı hem de dijital içeriğin doğasını gözeterek düzenlenmiştir.",
    sections: [
      {
        h2: "14 günlük iade hakkı",
        paras: [
          "Dijital ürünlerde satın alma tarihinden itibaren 14 gün içinde iade talep edebilirsiniz. Bu süre; e-kitaplar, PFA Ölçeği tam rapor hakkı, webinar erişimleri ve PFA-Pro lisans paketleri için geçerlidir.",
        ],
      },
      {
        h2: "İadenin kapsam dışı kaldığı durumlar",
        paras: [
          "Dijital içerik tüketildiğinde iade hakkı sona erer. Bu, açıkça şu anlama gelir: PFA Ölçeği raporunuz oluşturulduysa, PFA-Pro danışan kredilerinizin bir kısmı kullanıldıysa ya da e-kitabınız görüntülendiyse veya indirildiyse, ilgili ürün iade kapsamı dışına çıkar. Kısmen kullanılmış paketlerde, kullanılmamış bileşenler için orantılı iade değerlendirilebilir. Kullanmadığınız bir üründe teknik bir sorun yaşadıysanız, iade yerine önce çözüm üretmeye çalışırız.",
        ],
      },
      {
        h2: "Teslimat",
        paras: [
          "Bütün ürünler dijitaldir. E-kitaplar ve dijital haklar ödeme onaylandığı anda hesabınıza tanımlanır ve /hesabim sayfanızdan erişilebilir hâle gelir; beklemeniz gereken bir teslim süreci yoktur.",
          "İsme imzalı nüsha da dijitaldir: adınıza kişiselleştirilmiş bir PDF olarak hazırlanır ve hesabınızdan okunabilir veya indirilebilir.",
        ],
      },
      {
        h2: "İade talebi ve geri ödeme",
        paras: [
          "İade taleplerinizi sipariş numaranızla birlikte info@psychofunctionalanalysis.com adresine iletebilirsiniz. Talebinizi genellikle 3 iş günü içinde değerlendiririz. Onaylanan iadeler, ödemenin yapıldığı yönteme geri aktarılır; tutarın hesabınıza yansıması bankanıza bağlı olarak birkaç iş günü sürebilir.",
          "Bu site ve dijital ürünler Burak Akçakanat (şahıs) tarafından işletilmektedir. İletişim: info@psychofunctionalanalysis.com",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Legal",
    h1: "Refund policy",
    updated: "Last updated: 29 July 2026",
    intro:
      "It matters to us that you are satisfied with what you buy. The terms below take account of both your rights and the nature of digital content.",
    sections: [
      {
        h2: "14-day right of withdrawal",
        paras: [
          "For digital products you may request a refund within 14 days of purchase. This applies to e-books, the PFA Assessment full report entitlement, webinar access and PFA-Pro licence packages.",
        ],
      },
      {
        h2: "When a refund is no longer available",
        paras: [
          "The right to a refund ends once digital content has been consumed. In plain terms: if your PFA Assessment report has been generated, if part of your PFA-Pro client credits has been used, or if your e-book has been viewed or downloaded, that product falls outside the scope of a refund. For partly used packages, a proportional refund may be considered for the components that have not been used. If you have run into a technical problem with a product you have not used, we will try to resolve it first rather than refund straight away.",
        ],
      },
      {
        h2: "Delivery",
        paras: [
          "All products are digital. E-books and digital entitlements are added to your account the moment payment is confirmed and become accessible from your account page; there is no delivery period to wait for.",
          "The personalised signed copy is digital as well: it is prepared as a PDF personalised to your name, and can be read or downloaded from your account.",
        ],
      },
      {
        h2: "Requesting a refund and repayment",
        paras: [
          "You can send refund requests, together with your order number, to info@psychofunctionalanalysis.com. We normally review a request within 3 working days. Approved refunds are returned to the payment method used; depending on your bank, it may take a few working days for the amount to appear in your account.",
          "This site and its digital products are operated by Burak Akcakanat (sole proprietor). Contact: info@psychofunctionalanalysis.com",
        ],
      },
    ],
  },
};

export const TERMS_COPY: Record<"tr" | "en", LegalCopy> = {
  tr: {
    eyebrow: "Yasal",
    h1: "Kullanım Koşulları",
    updated: "Son güncelleme: 29 Temmuz 2026",
    intro:
      "Bu koşullar, psychofunctionalanalysis.com adresinde sunulan içerik, hizmet ve dijital ürünlerin kullanımını düzenler. Siteyi kullanarak veya bir ürün satın alarak aşağıdaki koşulları kabul etmiş olursunuz.",
    sections: [
      {
        h2: "İşletmeci",
        paras: [
          "Bu site ve dijital ürünler Burak Akçakanat (şahıs) tarafından işletilmektedir. İletişim: info@psychofunctionalanalysis.com",
        ],
      },
      {
        h2: "Hesap ve sorumluluk",
        paras: [
          "Hesabınızın güvenliği size aittir; giriş bilgilerinizi paylaşmamanız ve hesabınız üzerinden yapılan işlemlerden sorumlu olduğunuzu bilmeniz gerekir. Verdiğiniz bilgilerin doğru ve güncel olması, siparişlerin ve dijital teslimatların size ulaşabilmesi için gereklidir. Hesabınızda yetkisiz bir kullanım fark ederseniz lütfen bize yazın.",
        ],
      },
      {
        h2: "Dijital içerik lisansı",
        paras: [
          "Satın aldığınız e-kitaplar, PFA Ölçeği raporları, webinar kayıtları ve benzeri dijital içerikler size kişisel, devredilemez ve münhasır olmayan bir kullanım lisansı sağlar. Bu içerikler kopyalanamaz, çoğaltılamaz, yeniden satılamaz, kamuya açık platformlarda paylaşılamaz veya üçüncü kişilere aktarılamaz. İsme imzalı nüshalar alıcıya özel olarak kişiselleştirilir; hediye akışı dışında başka bir kişiye devredilemez.",
        ],
      },
      {
        h2: "Fikrî mülkiyet",
        paras: [
          "Psiko-Fonksiyonel Analiz modeli, yedi seviyeli harita, 7Q çerçevesi, PFA Ölçeği soru havuzu ve raporlama metinleri, kitap metinleri, görseller ve site içeriği Burak Akçakanat'a aittir ve telif hakkı ile korunur. Kaynak göstererek kısa alıntı yapabilirsiniz; bunun ötesindeki kullanım için yazılı izin gerekir.",
        ],
      },
      {
        h2: "Hizmetin sunumu",
        paras: [
          "Site ve dijital hizmetler \u201Colduğu gibi\u201D sunulur. Bakım, teknik arıza veya üçüncü taraf servis kesintileri nedeniyle erişimde geçici aksamalar yaşanabilir; kesintisiz erişim garanti edilmez. İçerik ve fiyatlar önceden bildirilmeksizin güncellenebilir; satın alma anındaki koşullar sizin için geçerlidir.",
          "PFA içerikleri, ölçek sonuçları ve danışmanlık oturumları eğitsel ve gelişimsel amaçlıdır; tıbbi teşhis, tedavi veya psikiyatrik hizmet yerine geçmez.",
        ],
      },
      {
        h2: "İletişim",
        paras: [
          "Bu koşullarla ilgili sorularınız için info@psychofunctionalanalysis.com adresine yazabilirsiniz.",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Legal",
    h1: "Terms of use",
    updated: "Last updated: 29 July 2026",
    intro:
      "These terms govern the use of the content, services and digital products offered at psychofunctionalanalysis.com. By using the site or buying a product you accept the terms below.",
    sections: [
      {
        h2: "Operator",
        paras: [
          "This site and its digital products are operated by Burak Akcakanat (sole proprietor). Contact: info@psychofunctionalanalysis.com",
        ],
      },
      {
        h2: "Account and responsibility",
        paras: [
          "The security of your account is yours to keep: do not share your login details, and be aware that you are responsible for activity carried out through your account. The information you provide must be accurate and current so that orders and digital deliveries can reach you. If you notice unauthorised use of your account, please write to us.",
        ],
      },
      {
        h2: "Digital content licence",
        paras: [
          "The e-books, PFA Assessment reports, webinar recordings and similar digital content you buy give you a personal, non-transferable, non-exclusive licence to use them. This content may not be copied, reproduced, resold, shared on publicly accessible platforms or passed on to third parties. Personalised signed copies are personalised specifically to the buyer; apart from the gift flow, they cannot be transferred to another person.",
        ],
      },
      {
        h2: "Intellectual property",
        paras: [
          "The Psycho-Functional Analysis model, the seven-level map, the 7Q framework, the PFA Assessment item pool and report texts, the book texts, the images and the site content belong to Burak Akçakanat and are protected by copyright. You may quote briefly with attribution; any use beyond that requires written permission.",
        ],
      },
      {
        h2: "Provision of the service",
        paras: [
          "The site and the digital services are provided \u201Cas is\u201D. Access may be temporarily disrupted by maintenance, technical faults or third-party service outages; uninterrupted access is not guaranteed. Content and prices may be updated without prior notice; the terms in force at the moment of your purchase are the ones that apply to you.",
          "PFA content, assessment results and consultation sessions are educational and developmental in purpose. They are not a substitute for medical diagnosis, treatment or psychiatric care.",
        ],
      },
      {
        h2: "Contact",
        paras: [
          "If you have questions about these terms, you can write to info@psychofunctionalanalysis.com.",
        ],
      },
    ],
  },
};