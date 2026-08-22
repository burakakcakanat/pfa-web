import { createFileRoute } from "@tanstack/react-router";
import { LicensePage, type LicensePageCopy } from "@/components/license-page";

const CANONICAL = "https://psychofunctionalanalysis.com/kurumsal-program-lisansi";

export const Route = createFileRoute("/kurumsal-program-lisansi")({
  head: () => ({
    meta: [
      { title: "Kurumsal Lisans — PFA'yı Kendi Programınızda Kullanın" },
      {
        name: "description",
        content:
          "Eğitim kurumları, akademiler, üniversite birimleri ve danışmanlık şirketleri için PFA Kurumsal Program Lisansı: PFA'yı kendi programlarınızın içinde yürütme başvurusu.",
      },
      { property: "og:title", content: "PFA Kurumsal Lisans" },
      {
        property: "og:description",
        content:
          "PFA'yı kendi eğitim programlarınıza yerleştirmek ve kendi kitlenize sunmak için Kurumsal Program Lisansı başvurusu.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: InstitutionalLicensePage,
});

/* ===========================================================================
   PAGE COPY — TÜM SAYFA METNİ BURADA (çeviri için tek blok)
   =========================================================================== */
const COPY: LicensePageCopy = {
  eyebrow: "PFA KURUMSAL LİSANS",
  h1: "PFA'yı kendi programınızın içinde yürütün.",
  proposition:
    "Kurumsal Program Lisansı, hâlihazırda eğitim veren bir kuruma PFA'yı kendi müfredatında yürütme ve kendi kitlesine sunma imkânı tanır.",
  heroNote:
    "Bu bir satış sayfası değil, başvuru sayfasıdır. İlan edilmiş bir bedel ya da hazır bir sözleşme yoktur; kapsam, süre ve ticari koşullar değerlendirme sonrasında karşılıklı görüşmeyle belirlenir.",
  ctaLabel: "BAŞVURU FORMUNA GİT",

  coversEyebrow: "LİSANS NEYİ KAPSAR",
  coversTitle: "Mevcut programınıza yerleşen bir modül",
  coversIntro:
    "Kurumsal Program Lisansı, PFA'yı sıfırdan bir eğitim işi kurmak için değil, hâlihazırda yürüttüğünüz programların içine yerleştirmek için konuşulur. Kapsamın sınırı sözleşmede tanımlanır.",
  covers: [
    {
      title: "Müfredata yerleştirme",
      body: "PFA'nın yedi seviyeli yapısının mevcut eğitim, sertifika ya da ders programınızın içinde bir modül olarak yürütülmesi.",
    },
    {
      title: "Eğitmen yetkilendirme",
      body: "Kurumunuzun kendi eğitmenlerinin PFA modülünü yürütebilmesi için hazırlık ve yetkilendirme süreci. Yetkilendirme kişiye bağlıdır.",
    },
    {
      title: "Eğitim materyalleri",
      body: "Sunum, katılımcı materyali ve vaka örneklerinin kurum kullanımına açılması; kurumunuzun formatına uyarlanabilir çerçeve.",
    },
    {
      title: "Ölçme araçlarının kurum içi kullanımı",
      body: "PFA Ölçeği ve 7Q Profili'nin katılımcılarınızla kullanılması; katılımcı raporlarının program akışına bağlanması.",
    },
    {
      title: "Kendi kitlenize satış",
      body: "PFA içeren programın kurumunuzun kendi katılımcı kitlesine, kendi fiyatlandırmanızla sunulması. Kapsam ve koşullar sözleşmeye bağlıdır. Programınızın fiyatını siz belirlersiniz. PFA Ölçeği ve 7Q Profili ise katılımcıya PFA'nın ilan ettiği fiyattan ulaşır; ölçme araçlarının fiyatlandırması lisans kapsamında değildir.",
    },
    {
      title: "Akademik kullanım",
      body: "Üniversite birimleri için ders, seminer ve araştırma kullanımı; atıf ve yayın çerçevesinin birlikte tanımlanması.",
    },
  ],
  coversFootnote:
    "Kapsam, süre, hangi programlarda kullanılabileceği, münhasırlık durumu ve marka kullanım hakları yalnızca imzalanan sözleşmede tanımlanır. Bu sayfadaki hiçbir ifade bu hakların önceden verildiği anlamına gelmez.",

  audienceEyebrow: "KİME UYGUN",
  audienceTitle: "Zaten eğitim veren kurumlar",
  audienceIntro:
    "Kurumsal Program Lisansı, kendi katılımcı kitlesi ve kendi eğitim altyapısı olan yapılar için tasarlanmıştır: eğitim kurumları, akademiler, üniversite birimleri ve danışmanlık şirketleri.",
  criteria: [
    "Faal bir eğitim, sertifika programı, akademi ya da danışmanlık hizmeti — yalnızca planlanan değil, yürüyen bir program.",
    "Eğitimi yürütecek kendi eğitmen kadrosu veya sözleşmeli eğitmen ağı.",
    "Kendi katılımcı kitlesi ya da kurumsal müşteri portföyü.",
    "Program kalitesi ve katılımcı geri bildirimini takip eden bir yapı.",
    "PFA metodolojisini okumuş, kitabı ve ölçeği incelemiş bir program sorumlusu.",
    "İçerik bütünlüğü ve etik sınırlar konusunda kurumsal sorumluluk alma isteği.",
  ],
  notForTitle: "Bu lisans şunlar için değil",
  notFor: [
    "Bireysel uygulayıcılar ve kendi danışanlarıyla çalışanlar — bunun yolu Uygulayıcı Programı'dır.",
    "Bir ülkeyi veya bölgeyi temsil etmek isteyen yapılar — bunun yolu Ülke Lisansı'dır.",
    "PFA'yı kendi markası altında yeniden adlandırıp sunmak isteyen kurumlar.",
    "Yalnızca içerik arşivine erişmek isteyen, eğitim yürütme niyeti olmayan kurumlar.",
  ],

  processEyebrow: "SÜREÇ",
  processTitle: "Başvurudan programa",
  stages: [
    {
      title: "Başvuru",
      body: "Bu sayfadaki formu doldurursunuz. Kurum tipi, yürüttüğünüz programlar, eğitmen kadronuz ve PFA'yı nerede kullanmak istediğinizi anlatırsınız.",
    },
    {
      title: "Ön inceleme",
      body: "Başvuruyu ve mevcut programlarınızı inceleriz; eksik bilgi varsa e-posta ile sorarız. Bu aşamada bir taahhüt oluşmaz.",
    },
    {
      title: "Program görüşmesi",
      body: "Çevrimiçi görüşme: PFA'nın hangi programda, hangi saat yüküyle ve hangi katılımcı profiliyle yer alacağı üzerine.",
    },
    {
      title: "Entegrasyon taslağı",
      body: "Karşılıklı ilgi sürerse PFA modülünün mevcut müfredatınıza nasıl yerleşeceğine dair bir taslak birlikte çıkarılır.",
    },
    {
      title: "Koşulların görüşülmesi",
      body: "Kapsam, süre, eğitmen sayısı, katılımcı hacmi ve ticari koşullar bu aşamada birlikte belirlenir. Standart ve ilan edilmiş bir fiyat listesi yoktur.",
    },
    {
      title: "Eğitmen hazırlığı ve başlangıç",
      body: "Sözleşme sonrasında eğitmenlerinizin hazırlığı tamamlanır, materyaller devredilir ve modül ilk döneminde açılır.",
    },
  ],

  obligationsEyebrow: "YÜKÜMLÜLÜKLER",
  obligationsTitle: "Lisans sahibi kurumdan beklenenler",
  obligations: [
    {
      title: "İçerik bütünlüğü",
      body: "Yedi seviyeli yapı, seviye tanımları ve zekâ türleri korunur. Kurumun kendi vaka ve örnekleri eklenebilir; modelin kendisi değiştirilmez.",
    },
    {
      title: "Yetkili eğitmen",
      body: "PFA modülü yalnızca hazırlığı tamamlanmış ve yetkilendirilmiş eğitmenlerce yürütülür. Eğitmen değişiklikleri bildirilir.",
    },
    {
      title: "Program şeffaflığı",
      body: "Katılımcıya PFA modülünün lisanslı bir içerik olduğu ve kaynağının PFA olduğu açıkça belirtilir.",
    },
    {
      title: "Ölçek kullanımı",
      body: "PFA Ölçeği ve 7Q Profili'nin puanlama mantığı ve rapor yapısı değiştirilmez; sonuçlar katılımcıya kurumsal karar aracı olarak değil, gelişim aracı olarak sunulur.",
    },
    {
      title: "Etik çerçeve",
      body: "PFA bir tanı aracı değildir; işe alım, terfi ya da eleme kararlarının tek dayanağı olarak kullanılamaz ve sağlık hizmeti yerine geçmez.",
    },
    {
      title: "Kayıt ve raporlama",
      body: "Dönemsel olarak modülün açıldığı programlar, eğitmenler ve katılımcı sayıları paylaşılır. Katılımcıların bireysel ölçek sonuçları paylaşılmaz.",
    },
  ],
  nameUseTitle: "PFA adının kullanımı",
  nameUse: [
    "PFA adı ve görsel kimliği yalnızca sözleşmede tanımlanan programlarda ve verilen kılavuza uygun kullanılır.",
    "Program tanıtımında PFA modülünün kapsamı, kurumun kendi içeriğinden ayrılabilecek biçimde belirtilir.",
    "Kurum, PFA adıyla kendi başına bir sertifikasyon, unvan ya da akreditasyon ihdas edemez; katılımcı belgesinin biçimi sözleşmede tanımlanır.",
    "Sözleşme sona erdiğinde PFA adının, materyallerin ve ölçme araçlarının kullanımı durur.",
  ],

  faqEyebrow: "SIK SORULAN SORULAR",
  faqTitle: "Açık sorular, açık yanıtlar",
  faq: [
    {
      q: "Lisans bedeli nedir?",
      a: "İlan edilmiş bir bedel yoktur. Programın kapsamı, eğitmen sayısı ve katılımcı hacmi farklılaştığı için koşullar değerlendirme sonrasında birlikte belirlenir.",
    },
    {
      q: "Katılımcılarımıza kendi sertifikamızı verebilir miyiz?",
      a: "Katılımcı belgesinin biçimi ve üzerinde PFA'ya nasıl atıf yapılacağı sözleşmede tanımlanır. Bu sayfada verilmiş bir sertifikasyon yetkisi yoktur.",
    },
    {
      q: "Kaç kurum bu lisansı kullanıyor?",
      a: "Program yeni açılmaktadır. Mevcut lisanslı kurumlar, katılımcı hacmi ya da pazar büyüklüğü üzerine bir iddiada bulunmuyoruz — çünkü henüz böyle bir tablo yok.",
    },
    {
      q: "Eğitmenlerimiz ayrı bir hazırlıktan geçmek zorunda mı?",
      a: "Evet. Modülü yürütecek her eğitmen PFA hazırlık sürecini tamamlar; yetkilendirme kuruma değil, kişiye bağlıdır.",
    },
    {
      q: "PFA Ölçeği'ni kendi platformumuza gömebilir miyiz?",
      a: "Teknik entegrasyon talebinizi formda belirtin. Mümkün olup olmadığı ve hangi koşullarla mümkün olduğu görüşmede ele alınır; otomatik olarak lisans kapsamında değildir.",
    },
    {
      q: "Bizim sektörümüze özel bir uyarlama yapabilir miyiz?",
      a: "Vaka, örnek ve dil kurumunuzun alanına uyarlanabilir. Seviye yapısı, zekâ türleri ve puanlama mantığı değişmez.",
    },
    {
      q: "Ülke lisansıyla aynı şey mi?",
      a: "Hayır. Ülke lisansı bir bölgede PFA'yı temsil etmek, yerelleştirmek ve yerel uygulayıcı ağı kurmakla ilgilidir. Kurumsal Program Lisansı yalnızca kurumun kendi programları ve kendi kitlesiyle sınırlıdır.",
    },
  ],

  formEyebrow: "BAŞVURU",
  formTitle: "Kurumsal Program Lisansı Başvurusu",
  formIntro:
    "Form bir ön başvurudur; doldurmanız taraflar arasında bir yükümlülük doğurmaz. Bilgileri yalnızca değerlendirme için kullanırız.",
  form: {
    commonHeading: "İLETİŞİM BİLGİLERİ",
    specificHeading: "KURUM VE PROGRAM BİLGİLERİ",
    messageLabel: "Eklemek istedikleriniz",
    messageHint:
      "Kurumunuzu, katılımcı profilinizi ve PFA'yı hangi programda nasıl konumlandırmayı düşündüğünüzü yazın. En az 30 karakter.",
    consentLabel:
      "Paylaştığım bilgilerin bu başvurunun değerlendirilmesi ve bana dönüş yapılması amacıyla işlenmesini onaylıyorum.",
    submit: "BAŞVURUYU GÖNDER",
    submitting: "Gönderiliyor…",
    successTitle: "Başvurunuz alındı",
    successBody:
      "Başvurunuz kaydedildi ve e-posta adresinize bir onay mesajı gönderildi. Değerlendirme tamamlandığında sonucu yazılı olarak ileteceğiz.",
    fields: [
      {
        name: "institution_type",
        label: "Kurum tipi",
        required: true,
        hint: "Örn. özel eğitim kurumu, akademi, üniversite birimi, danışmanlık şirketi.",
      },
      { name: "annual_trainee_volume", label: "Yıllık yaklaşık katılımcı sayısı", type: "number" },
      { name: "trainer_count", label: "Eğitmen sayısı", type: "number" },
      { name: "expected_timeline", label: "Beklenen zaman planı" },
      {
        name: "current_programmes",
        label: "Şu anda yürüttüğünüz eğitim programları",
        type: "textarea",
        rows: 5,
        hint: "Program adları, süreleri ve katılımcı profili.",
      },
      {
        name: "intended_use",
        label: "PFA'yı nasıl kullanmayı planlıyorsunuz?",
        type: "textarea",
        required: true,
        rows: 5,
        minLength: 30,
        hint: "Hangi programda, hangi saat yüküyle ve kimlere. En az 30 karakter.",
      },
    ],
  },
};

function InstitutionalLicensePage() {
  return <LicensePage type="kurumsal" copy={COPY} />;
}
