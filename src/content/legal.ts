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
export const PRIVACY_COPY: Record<"tr" | "en", LegalCopy> = {
  tr: {
    eyebrow: "Yasal",
    h1: "Gizlilik ve KVKK Aydınlatma Metni",
    updated: "Son güncelleme: 4 Ağustos 2026",
    intro:
      "Bu metin, psychofunctionalanalysis.com üzerinde hangi kişisel verilerin işlendiğini, neden işlendiğini ve haklarınızı nasıl kullanabileceğinizi açıklar. Site ve dijital ürünler Burak Akçakanat (şahıs) tarafından işletilir; veri sorumlusu Burak Akçakanat'tır. İletişim: info@psychofunctionalanalysis.com",
    sections: [
      {
        h2: "İşlenen veriler",
        paras: [
          "Hesap verileri: adınız, e-posta adresiniz ve hesabınızla ilgili temel kayıtlar. Sipariş verileri: satın aldığınız dijital ürünler, sipariş kayıtları ve erişim haklarınız. Ölçek verileri: PFA Ölçeği ve 7Q Profili yanıtlarınız ile bunlardan üretilen rapor. Bülten verileri: bülten kaydınız ve onay kaydınız. İletişim verileri: bize gönderdiğiniz form ve e-posta içerikleri.",
          "İsteğe bağlı demografik bilgileri (yaş aralığı, cinsiyet, eğitim, meslek alanı) yalnızca siz paylaşmayı seçerseniz işleriz; hiçbiri zorunlu değildir.",
        ],
      },
      {
        h2: "İşleme amaçları",
        paras: [
          "Verileriniz; hesabınızı yönetmek, satın aldığınız dijital ürünleri ve erişim haklarınızı sağlamak, ölçek raporunuzu oluşturmak, işlem e-postalarını göndermek, açık onay verdiyseniz bülten göndermek ve sorularınızı yanıtlamak için işlenir.",
        ],
      },
      {
        h2: "Ölçek sonuçlarınızın gizliliği",
        paras: [
          "Bireysel ölçek sonuçlarınız yalnızca size ve açıkça yetkilendirdiğiniz uygulayıcıya açıktır. Yönetim tarafında ölçek yanıtlarınız görüntülenmez.",
          "Madde düzeyindeki yanıtlarınız, yalnızca ayrıca açık rıza verdiyseniz ve kimliğinizden arındırılmış biçimde ölçek geçerlik ve güvenilirlik çalışmalarında kullanılır. Bu tamamen isteğe bağlıdır; onay vermemek raporunuza ve hizmete erişiminizi etkilemez, onayınızı Hesabım sayfasından dilediğiniz zaman geri çekebilirsiniz.",
        ],
      },
      {
        h2: "E-posta ve bülten",
        paras: [
          "Bültene yalnızca KVKK kapsamında açık onay vererek kaydolabilirsiniz. Her bülten e-postasındaki bağlantıdan ya da Hesabım sayfanızdan çıkabilirsiniz. Sipariş onayı, dijital teslimat ve hesap güvenliği gibi işlem e-postaları hizmetin kullanımı için gönderilir.",
        ],
      },
      {
        h2: "Hizmet sağlayıcılar",
        paras: [
          "Hizmeti sunabilmek için sınırlı sayıda hizmet sağlayıcı kullanırız: barındırma ve veritabanı altyapısı, e-posta gönderim servisi ve ödeme hizmeti sağlayıcısı. Bu sağlayıcılar verileri yalnızca bizim adımıza ve bu metinde belirtilen amaçlarla işler; altyapımız Avrupa Birliği'nde barındırılır. Kişisel verilerinizi reklam amacıyla üçüncü kişilere satmayız veya kiralamayız.",
        ],
      },
      {
        h2: "Saklama süresi",
        paras: [
          "Hesap ve sipariş kayıtları, hesabınız açık olduğu sürece ve yasal saklama yükümlülükleri gerektirdiği ölçüde saklanır. Bülten kaydı, çıkana kadar tutulur. Ölçek verileriniz, hesabınıza bağlı olarak, siz silinmesini talep edene kadar saklanır.",
        ],
      },
      {
        h2: "Haklarınız",
        paras: [
          "KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) kapsamında; verilerinize erişme, düzeltilmesini, silinmesini veya işlenmesinin kısıtlanmasını isteme ve verdiğiniz onayı geri çekme hakkına sahipsiniz. Bu haklarınızı kullanmak için info@psychofunctionalanalysis.com adresine yazabilirsiniz.",
        ],
      },
      {
        h2: "Çerezler",
        paras: [
          "Site, oturumunuzu sürdürmek ve tercihlerinizi hatırlamak için gerekli olan teknik çerezleri ve tarayıcı depolamasını kullanır. Reklam amaçlı takip yapılmaz.",
        ],
      },
      {
        h2: "İletişim",
        paras: [
          "Gizlilikle ilgili tüm sorularınız için info@psychofunctionalanalysis.com adresine yazabilirsiniz.",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Legal",
    h1: "Privacy policy",
    updated: "Last updated: 4 August 2026",
    intro:
      "This page explains which personal data is processed on psychofunctionalanalysis.com, why it is processed, and how you can exercise your rights. The site and its digital products are operated by Burak Akcakanat (sole proprietor), who is the data controller. Contact: info@psychofunctionalanalysis.com",
    sections: [
      {
        h2: "Data we process",
        paras: [
          "Account data: your name, your email address and basic records relating to your account. Order data: the digital products you buy, order records and your access entitlements. Assessment data: your PFA Assessment and 7Q Profile answers and the report generated from them. Newsletter data: your subscription and your record of consent. Contact data: the content of forms and emails you send us.",
          "Optional demographic details (age band, gender, education, occupational field) are processed only if you choose to share them; none of them is required.",
        ],
      },
      {
        h2: "Purposes of processing",
        paras: [
          "Your data is processed to manage your account, to deliver the digital products and access entitlements you have bought, to generate your assessment report, to send transactional emails, to send the newsletter where you have given explicit consent, and to answer your questions.",
        ],
      },
      {
        h2: "Confidentiality of your assessment results",
        paras: [
          "Your individual assessment results are visible only to you and to a practitioner you have explicitly authorised. Your assessment answers are not viewed on the administrative side.",
          "Your item-level answers are used in validity and reliability work only where you have given separate explicit consent, and only in de-identified form. This is entirely optional: withholding consent does not affect your own report or your access to the service, and you can withdraw consent at any time from your account page.",
        ],
      },
      {
        h2: "Email and newsletter",
        paras: [
          "You can only join the newsletter by giving explicit consent. You can leave at any time using the link in any newsletter email or from your account page. Transactional emails such as order confirmation, digital delivery and account security are sent as part of using the service.",
        ],
      },
      {
        h2: "Service providers",
        paras: [
          "To run the service we use a limited number of service providers: hosting and database infrastructure, an email delivery service and a payment service provider. These providers process data only on our behalf and for the purposes set out here; our infrastructure is hosted in the European Union. We do not sell or rent your personal data to third parties for advertising.",
        ],
      },
      {
        h2: "Retention",
        paras: [
          "Account and order records are kept while your account is open and for as long as statutory retention obligations require. Newsletter records are kept until you unsubscribe. Your assessment data is kept with your account until you ask for it to be deleted.",
        ],
      },
      {
        h2: "Your rights",
        paras: [
          "Under Turkish data-protection law (KVKK, Law No. 6698 on the Protection of Personal Data) you have the right to access your data, to ask for it to be corrected, deleted or restricted, and to withdraw consent you have given. To exercise these rights, write to info@psychofunctionalanalysis.com.",
        ],
      },
      {
        h2: "Cookies",
        paras: [
          "The site uses the technical cookies and browser storage needed to keep you signed in and to remember your preferences. There is no advertising tracking.",
        ],
      },
      {
        h2: "Contact",
        paras: [
          "For any privacy question, write to info@psychofunctionalanalysis.com.",
        ],
      },
    ],
  },
};
