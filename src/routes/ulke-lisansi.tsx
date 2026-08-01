import { createFileRoute } from "@tanstack/react-router";
import { LicensePage, type LicensePageCopy } from "@/components/license-page";

const CANONICAL = "https://psychofunctionalanalysis.com/ulke-lisansi";

export const Route = createFileRoute("/ulke-lisansi")({
  head: () => ({
    meta: [
      { title: "Ülke Lisansı — PFA Temsilciliği Başvurusu" },
      {
        name: "description",
        content:
          "PFA'yı bir ülkede veya bölgede temsil etmek için lisans başvurusu: materyallerin yerelleştirilmesi, yerel uygulayıcı ağı ve yerel eğitim yürütümü.",
      },
      { property: "og:title", content: "PFA Ülke Lisansı" },
      {
        property: "og:description",
        content:
          "Bir ülkede PFA temsilciliği: yerelleştirme, yerel uygulayıcı ağı ve eğitim yürütümü için başvuru sayfası.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: CountryLicensePage,
});

/* ===========================================================================
   PAGE COPY — TÜM SAYFA METNİ BURADA (çeviri için tek blok)
   =========================================================================== */
const COPY: LicensePageCopy = {
  eyebrow: "PFA ÜLKE LİSANSI",
  h1: "PFA'yı bir ülkede temsil etmek için başvuru.",
  proposition:
    "Ülke lisansı, PFA'nın bir ülkede ya da tanımlı bir bölgede yerelleştirilmesini, tanıtılmasını ve eğitim yürütümünü tek bir muhataba bağlar.",
  heroNote:
    "Bu bir satış sayfası değil, başvuru sayfasıdır. İlan edilmiş bir bedel ya da hazır bir sözleşme yoktur; kapsam, süre ve ticari koşullar değerlendirme sonrasında karşılıklı görüşmeyle belirlenir.",
  ctaLabel: "BAŞVURU FORMUNA GİT",

  coversEyebrow: "LİSANS NEYİ KAPSAR",
  coversTitle: "Bir bölgede PFA'nın taşınması",
  coversIntro:
    "Aşağıdakiler lisansın konuşulduğu çalışma alanlarıdır. Her bir alanın sınırı, hangi materyalleri ve hangi süreyi kapsadığı imzalanacak sözleşmede tanımlanır.",
  covers: [
    {
      title: "Çeviri ve yerelleştirme",
      body: "PFA kitabının, PFA Ölçeği'nin ve eğitim materyallerinin hedef dile çevrilmesi ve kültürel olarak uyarlanması. Çeviriler yayımlanmadan önce onaydan geçer.",
    },
    {
      title: "Yerel uygulayıcı ağı",
      body: "Bölgede PFA uygulayıcılarının yetiştirilmesi, başvuruların ön değerlendirmesi ve yerel uygulayıcı topluluğunun kurulması. Uygulayıcı lisansları PFA merkez tarafından verilir.",
    },
    {
      title: "Yerel eğitim yürütümü",
      body: "PFA eğitim ve webinarlarının bölgede yerel dilde yürütülmesi; kurumsal ve bireysel katılımcılara yönelik yerel program takvimi.",
    },
    {
      title: "Tanıtım ve iletişim",
      body: "Bölgede PFA'nın tanıtımı; yerel yayın, etkinlik ve medya ilişkileri. Marka kullanımı PFA iletişim kılavuzuna bağlıdır.",
    },
    {
      title: "Yerel muhataplık",
      body: "Bölgedeki kurumlar, üniversiteler ve yayıncılarla ilk temasın yürütülmesi; taleplerin PFA merkezine taşınması.",
    },
    {
      title: "Ölçme araçlarının bölgesel kullanımı",
      body: "PFA Ölçeği ve 7Q Profili'nin bölgede kullanımı; puanlama mantığı ve rapor yapısı değiştirilmeden korunur.",
    },
  ],
  coversFootnote:
    "Bölge sınırı, münhasırlık durumu, süre, sertifikasyon yetkisi ve marka kullanım hakları yalnızca imzalanan sözleşmede tanımlanır. Bu sayfadaki hiçbir ifade bu hakların önceden verildiği anlamına gelmez.",

  audienceEyebrow: "KİME UYGUN",
  audienceTitle: "Bir bölgeyi taşıyabilecek yapı",
  audienceIntro:
    "Ülke lisansı, bireysel bir uygulama isteğinden farklıdır: bölgede yayın, eğitim ve topluluk kurma işini yürütecek bir işletme ya da ekip arıyoruz.",
  criteria: [
    "Hedef bölgede yasal olarak faaliyet gösteren bir işletme, kurum veya kurulabilir bir yapı.",
    "Eğitim, danışmanlık, psikoloji, koçluk, yayıncılık veya kurumsal gelişim alanlarından birinde saha deneyimi.",
    "Hedef dile ana dil düzeyinde hâkimiyet ve İngilizce ya da Türkçe üzerinden çalışabilme.",
    "Eğitim yürütecek ya da yürütülmesini organize edebilecek insan kaynağı.",
    "PFA metodolojisini okumuş, kitaba ve ölçeğe aşina olma.",
    "Uzun vadeli çalışma niyeti — birkaç aylık bir kampanya değil.",
  ],
  notForTitle: "Bu lisans şunlar için değil",
  notFor: [
    "Yalnızca kendi danışanlarıyla PFA kullanmak isteyenler — bunun yolu Uygulayıcı Programı'dır.",
    "PFA'yı yeniden adlandırmak, birleştirmek ya da kendi markası altında sunmak isteyenler.",
    "Metodolojiyi devralıp bağımsız bir türev geliştirmek isteyenler.",
    "Yeniden satış dışında bir katkı planlamayan aracılar.",
  ],

  processEyebrow: "SÜREÇ",
  processTitle: "Başvurudan sözleşmeye",
  stages: [
    {
      title: "Başvuru",
      body: "Bu sayfadaki formu doldurursunuz. Hedef bölge, mevcut faaliyet alanınız, ekibiniz ve bölgede nasıl ilerlemeyi düşündüğünüzü anlatırsınız.",
    },
    {
      title: "Ön inceleme",
      body: "Başvuruyu okur, eksik bilgi varsa e-posta ile sorarız. Bu aşamada bir taahhüt oluşmaz.",
    },
    {
      title: "Tanışma görüşmesi",
      body: "Çevrimiçi görüşme: bölgeyi nasıl okuduğunuz, hangi kanallarla çalışacağınız ve PFA'nın metodolojik çerçevesiyle nasıl kuracağınız üzerine.",
    },
    {
      title: "Bölge planı",
      body: "Karşılıklı ilgi sürerse, bölge için yazılı bir plan hazırlarsınız: yerelleştirme sırası, ilk yıl eğitim takvimi ve uygulayıcı ağı yaklaşımı.",
    },
    {
      title: "Koşulların görüşülmesi",
      body: "Kapsam, bölge sınırı, süre, yükümlülükler ve ticari koşullar bu aşamada birlikte belirlenir. Standart ve ilan edilmiş bir fiyat listesi yoktur.",
    },
    {
      title: "Sözleşme ve devir",
      body: "Sözleşme imzalanır; materyaller, eğitim erişimi ve kullanım kılavuzları devredilir. Yerelleştirme bu noktada başlar.",
    },
  ],

  obligationsEyebrow: "YÜKÜMLÜLÜKLER",
  obligationsTitle: "Lisans sahibinden beklenenler",
  obligations: [
    {
      title: "Metodolojik bütünlük",
      body: "Yedi seviyeli yapı, seviye tanımları, zekâ türleri ve ölçek puanlama mantığı korunur. Yerelleştirme dilde ve örneklerde yapılır, modelin kendisinde yapılmaz.",
    },
    {
      title: "Çeviri kalitesi",
      body: "Çeviriler alan terminolojisine hâkim kişilerce yapılır ve yayımdan önce onaya sunulur. Terim sözlüğü ortak tutulur.",
    },
    {
      title: "Eğitim kalitesi",
      body: "Bölgede yürütülen eğitimler PFA eğitim çerçevesine uyar; eğitmenler PFA tarafından tanınmış olur. Kayıt ve katılımcı bilgileri düzenli paylaşılır.",
    },
    {
      title: "Etik çerçeve",
      body: "PFA bir tanı aracı değildir ve tek başına terapi, psikolojik danışmanlık ya da sağlık hizmeti sunma yetkisi vermez. Bu sınır bölgedeki tüm iletişimde açık tutulur.",
    },
    {
      title: "Raporlama",
      body: "Dönemsel olarak bölgedeki faaliyet, eğitim ve uygulayıcı sayıları raporlanır. Danışanların değerlendirme verileri paylaşılmaz.",
    },
    {
      title: "Veri ve gizlilik",
      body: "Katılımcı ve danışan verileri, bölgede geçerli veri koruma mevzuatına uygun işlenir. Bireysel ölçek sonuçları yalnızca kişinin kendisine ve yetkilendirdiği uygulayıcıya açıktır.",
    },
  ],
  nameUseTitle: "PFA adının kullanımı",
  nameUse: [
    "PFA adı ve görsel kimliği yalnızca sözleşmede tanımlanan kapsamda ve verilen kılavuza uygun kullanılır.",
    "Bölgedeki iletişimde lisansın niteliği açıkça belirtilir; PFA adı kaynağı gizleyecek biçimde kullanılamaz.",
    "PFA adıyla yeni bir sertifikasyon, unvan ya da akreditasyon ihdas edilmesi sözleşmede ayrıca düzenlenmedikçe mümkün değildir.",
    "Sözleşme sona erdiğinde PFA adının ve materyallerin kullanımı durur.",
  ],

  faqEyebrow: "SIK SORULAN SORULAR",
  faqTitle: "Açık sorular, açık yanıtlar",
  faq: [
    {
      q: "Lisans bedeli nedir?",
      a: "İlan edilmiş bir bedel yoktur. Bölgenin büyüklüğü, kapsam ve yükümlülükler farklılaştığı için koşullar değerlendirme sonrasında birlikte belirlenir.",
    },
    {
      q: "Bölgem bana özel mi olacak?",
      a: "Münhasırlık bu sayfada verilmiş bir taahhüt değildir. Bölge sınırının ve münhasır olup olmadığının tanımı sözleşmede yapılır.",
    },
    {
      q: "Şu anda kaç ülkede lisans var?",
      a: "Program yeni açılmaktadır. Mevcut lisans sahipleri, ciro ya da uygulayıcı sayısı üzerine bir iddiada bulunmuyoruz — çünkü henüz böyle bir tablo yok.",
    },
    {
      q: "Başvuru ne kadar sürede yanıtlanır?",
      a: "Başvurunuzun alındığını e-posta ile hemen bildiririz. Değerlendirme tamamlandığında sonucu yazılı olarak iletiriz; bunun ötesinde bir süre taahhüdü vermiyoruz.",
    },
    {
      q: "Kitabı kendim yayımlayabilir miyim?",
      a: "Yayın hakları ayrı bir konudur ve otomatik olarak lisansla birlikte gelmez. Yayıncılık planınız varsa formda belirtin; görüşmede ayrıca ele alınır.",
    },
    {
      q: "Bir şirketim yok, yine de başvurabilir miyim?",
      a: "Başvurabilirsiniz. Ancak sözleşme aşamasında bölgede yasal olarak faaliyet gösterebilecek bir yapı gerekir.",
    },
    {
      q: "Uygulayıcı lisanslarını ben mi vereceğim?",
      a: "Uygulayıcı lisansları PFA merkez tarafından verilir. Bölgede başvuruların toplanması, hazırlık ve ön değerlendirme lisans sahibiyle birlikte yürütülür.",
    },
  ],

  formEyebrow: "BAŞVURU",
  formTitle: "Ülke Lisansı Başvurusu",
  formIntro:
    "Form bir ön başvurudur; doldurmanız taraflar arasında bir yükümlülük doğurmaz. Bilgileri yalnızca değerlendirme için kullanırız.",
  form: {
    commonHeading: "İLETİŞİM BİLGİLERİ",
    specificHeading: "BÖLGE VE DENEYİM",
    messageLabel: "Eklemek istedikleriniz",
    messageHint:
      "Bölgeyi nasıl okuduğunuzu, mevcut işinizle PFA'yı nasıl birleştireceğinizi ve varsa sorularınızı yazın. En az 30 karakter.",
    consentLabel:
      "Paylaştığım bilgilerin bu başvurunun değerlendirilmesi ve bana dönüş yapılması amacıyla işlenmesini onaylıyorum.",
    submit: "BAŞVURUYU GÖNDER",
    submitting: "Gönderiliyor…",
    successTitle: "Başvurunuz alındı",
    successBody:
      "Başvurunuz kaydedildi ve e-posta adresinize bir onay mesajı gönderildi. Değerlendirme tamamlandığında sonucu yazılı olarak ileteceğiz.",
    fields: [
      { name: "target_territory", label: "Hedef ülke / bölge", required: true },
      { name: "existing_business_area", label: "Mevcut faaliyet alanınız" },
      { name: "team_size", label: "Ekip büyüklüğü (kişi)", type: "number" },
      { name: "years_in_field", label: "Alandaki deneyim (yıl)", type: "number" },
      { name: "expected_timeline", label: "Beklenen zaman planı" },
      {
        name: "why_pfa",
        label: "Neden PFA?",
        type: "textarea",
        required: true,
        rows: 5,
        minLength: 30,
        hint: "PFA'ya nereden ulaştınız ve neden bu metodoloji? En az 30 karakter.",
      },
      {
        name: "gtm_approach",
        label: "Bölgede nasıl ilerlemeyi düşünüyorsunuz?",
        type: "textarea",
        rows: 5,
        hint: "İlk adımlar, kanallar, olası iş ortakları, yerelleştirme sırası.",
      },
    ],
  },
};

function CountryLicensePage() {
  return <LicensePage type="ulke" copy={COPY} />;
}
