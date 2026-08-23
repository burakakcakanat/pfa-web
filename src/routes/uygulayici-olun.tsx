import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, BookOpen, Megaphone, Percent, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/uygulayici-olun")({
  head: () => ({
    meta: [
      { title: "PFA Uygulayıcı Programı — Başvuru" },
      {
        name: "description",
        content:
          "PFA'nın yedi seviyeli bilinç haritasını kendi alanınızda uygulamak için resmî lisans programı ve başvuru sayfası.",
      },
      { property: "og:title", content: "PFA Uygulayıcı Programı" },
      {
        property: "og:description",
        content:
          "Terapötik, koçluk, pedagojik ve kurumsal alanlar için PFA uygulayıcı lisans programı.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/uygulayici-olun" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/uygulayici-olun" }],
  }),
  component: BecomePractitionerPage,
});

type Category = "terapotik" | "kocluk" | "pedagojik" | "kurumsal";

const CATEGORIES: Array<{
  key: Category;
  title: string;
  audience: string;
  value: string;
}> = [
  {
    key: "terapotik",
    title: "Terapötik",
    audience: "Psikologlar, psikolojik danışmanlar, terapistler",
    value: "Danışan süreçlerinde bilinç haritasıyla seviye temelli derinlik.",
  },
  {
    key: "kocluk",
    title: "Koçluk",
    audience: "Profesyonel koçlar",
    value: "PFA BSÖ ile ölçülebilir gelişim takibi ve seans mimarisi.",
  },
  {
    key: "pedagojik",
    title: "Pedagojik",
    audience: "Eğitimciler, akademisyenler",
    value: "Öğrenme ve gelişim süreçlerine seviye temelli işlevsel yaklaşım.",
  },
  {
    key: "kurumsal",
    title: "Kurumsal",
    audience: "İK, lider gelişimi, kurum danışmanları",
    value: "Ekip ve liderlik gelişimi için işlevsel bilinç haritası.",
  },
];

const STAGES: Array<{ num: string; title: string; body: string }> = [
  {
    num: "01",
    title: "Başvuru",
    body: "PFA hesabınız üzerinden başvurursunuz: özgeçmiş, diploma veya mesleki sertifikasyon, kısa niyet metni. Durumunuzu hesabınızdan takip edersiniz.",
  },
  {
    num: "02",
    title: "Değerlendirme Görüşmesi",
    body: "Kurucu ya da eğitim direktörüyle birebir görüşme: alan deneyiminiz, kategoriye özel uygulama biçiminiz ve etik çerçeve üzerine. Değerlendirme yaklaşık 1–2 hafta içinde iletilir.",
  },
  {
    num: "03",
    title: "Kabul ve Lisans Kaydı",
    body: "Başvurunuz kabul edilirse lisans kaydınız açılır. Kayıt bedeli $1.490'dır ve ödendiğinde hazırlık materyallerinin tamamına erişiminiz başlar. Not: Ücret yalnızca kabul sonrası alınır. Başvuru ücretsizdir.",
  },
  {
    num: "04",
    title: "Hazırlık ve Sınav",
    body: "PFA kitabı, yedi bölümlük podcast serisi, video ve yazılı materyaller — kendi hızınızda. Hazır hissettiğinizde çevrimiçi uygulayıcı sınavına girersiniz.",
  },
  {
    num: "05",
    title: "Sertifikasyon Webinarı",
    body: "Kurucu Burak Akçakanat'ın yürüttüğü canlı webinar ile program tamamlanır. Numaralı PFA Practitioner lisansınız düzenlenir ve Uygulayıcı Rehberi'nde yayın hakkınız başlar. İlk yıl boyunca 1–2 mesleki gelişim webinarına ücretsiz katılırsınız.",
  },
  {
    num: "06",
    title: "Rozetinizi Seçin",
    body: "Lisansınız aktifken iki yoldan birini seçersiniz: PFA Practitioner olarak devam edebilir ya da gelişim programına abone olup PFA Fellow rozetine geçebilirsiniz. Seçiminizi istediğiniz zaman değiştirebilirsiniz.",
  },
];

const LIFECYCLE: Array<{ title: string; body: string }> = [
  {
    title: "Geçerlilik",
    body: "PFA Practitioner lisansı 5 yıl geçerlidir. PFA Fellow lisansı, aboneliğiniz aktif olduğu sürece geçerlidir; abonelikten ayrılırsanız 5 yıl daha geçerliliğini korur.",
  },
  {
    title: "Tazeleme",
    body: "Beş yılın sonunda bir günlük tazeleme çalışmasına katılırsınız. Bu çalışmalar sabit takvimle yılda iki kez — Mart ve Ekim — yapılır. Yenileme bedeli $240'dır; Fellow rozetindeyseniz %50 indirimlidir.",
  },
  {
    title: "Değerlendirme",
    body: "Tazeleme sırasında bir değerlendirme testi uygularız. Bu test eleyici değildir. 100 üzerinden 60 ve altı alırsanız ücretsiz bir tamamlama programına yönlendirilirsiniz; lisansınız etkilenmez.",
  },
  {
    title: "Devamsızlık",
    body: "Lisansınız düşmez, askıya alınır. Üst üste iki tazeleme penceresini kaçırırsanız, ikinci pencereden altı ay sonra rehberden çıkarılır ve lisansınız askıya alınır. Bir sonraki pencerede katılarak yeniden aktifleştirebilirsiniz.",
  },
];

const BADGE_ROWS: Array<{ label: string; practitioner: string; fellow: string }> = [
  { label: "Uygulayıcı Rehberi", practitioner: "✓", fellow: "✓ öncelikli sıralama" },
  { label: "Ölçek satış komisyonu", practitioner: "%25", fellow: "%50" },
  { label: "Gelişim programı", practitioner: "ücretli, isteğe bağlı", fellow: "dahil" },
  { label: "Lisans geçerliliği", practitioner: "5 yıl", fellow: "abonelik boyunca + 5 yıl" },
  { label: "Yenileme bedeli", practitioner: "$240", fellow: "$120 (%50 indirim)" },
  { label: "Yıllık abonelik", practitioner: "—", fellow: "$120" },
  { label: "Şablon site", practitioner: "—", fellow: "isteğe bağlı, $240/yıl (2027+)" },
  { label: "Dijital İkiz erişimi", practitioner: "isteğe bağlı, ücretli", fellow: "isteğe bağlı, ücretli" },
];

const FEATURES: Array<{
  icon: typeof LayoutDashboard;
  title: string;
  body: string;
  badge?: string;
}> = [
  {
    icon: LayoutDashboard,
    title: "Kendi Paneliniz",
    body: "Uygulayıcı paneliniz üzerinden tüm PFA çalışmanızı tek yerden yönetirsiniz.",
  },
  {
    icon: Users,
    title: "Danışan Yönetimi",
    body: "Danışanlarınızı davet eder, PFA BSÖ süreçlerini ve sonuçlarını kendi panelinizden takip edersiniz.",
  },
  {
    icon: BookOpen,
    title: "Sürekli Beslenme",
    body: "PFA ekosisteminin zengin materyalleri, webinarları ve workshoplarıyla mesleki gelişiminiz süreklilik kazanır. Fellow rozetinde ücretsiz.",
  },
  {
    icon: Megaphone,
    title: "Sürekli Tanıtım ve Danışan Potansiyeli",
    body: "Uygulayıcı Rehberi'nde yer alır, PFA'nın büyüyen okur ve danışan kitlesine doğrudan görünür olursunuz.",
  },
  {
    icon: Percent,
    title: "Ölçek Satışından Kazanç",
    body: "Referans kodunuzla veya kendi sitenizden yapılan PFA BSÖ satışlarında komisyon kazanırsınız: Fellow %50, Practitioner %25.",
  },
  {
    icon: Globe,
    title: "Şablon Site",
    body: "Fellow rozetinde isteğe bağlı hazır tanıtım siteniz.",
    badge: "2027",
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Lisans ücreti ne kadar ve ne zaman ödenir?",
    a: "Lisans kayıt bedeli $1.490'dır ve yalnızca başvurunuz kabul edildikten sonra alınır. Başvuru ücretsizdir.",
  },
  {
    q: "PFA seans gelirimden pay alıyor mu?",
    a: "Hayır. Seans ücretinizi kendiniz belirler, doğrudan tahsil edersiniz. PFA bu akışın tarafı değildir.",
  },
  {
    q: "Practitioner ile Fellow arasındaki fark nedir?",
    a: "Fellow, gelişim programına abone olan uygulayıcıdır. Gelişim programına ücretsiz erişir, ölçek satışlarında %50 komisyon alır (Practitioner %25), rehberde öncelikli sıralanır ve yenilemede %50 indirim kullanır.",
  },
  {
    q: "Rozetimi sonradan değiştirebilir miyim?",
    a: "Evet. Practitioner olarak başlayıp istediğiniz zaman abone olup Fellow'a geçebilir, aboneliği bırakıp Practitioner'a dönebilirsiniz.",
  },
  {
    q: "Lisansım biterse ne olur?",
    a: "Lisans düşmez, askıya alınır. Bir sonraki tazeleme penceresinde katılarak yeniden aktifleştirebilirsiniz.",
  },
];

function BecomePractitionerPage() {
  return (
    <main className="bg-background text-foreground">
      {/* Hero */}
      <section className="container-page pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-accent">
            PFA Uygulayıcı Programı
          </div>
          <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
            PFA'yı kendi alanınızda uygulayın.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
            PFA'nın yedi seviyeli bilinç haritasını danışan, öğrenci ve ekiplerle
            çalışmada kullanmak için resmî lisans programı. Program, mevcut mesleki
            yetkinliğinize seviye temelli bir metodoloji ekler.
          </p>
          <a
            href="#basvuru"
            className="mt-9 inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
          >
            BAŞVURU FORMUNA GİT
          </a>
        </div>
      </section>

      {/* Kime uygun */}
      <section className="container-page pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">KİME UYGUN</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">
              Dört uygulama alanı, ortak yol.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div
                key={c.key}
                className="flex h-full flex-col border border-border bg-card p-7"
              >
                <div className="text-[11px] tracking-[0.28em] text-accent">
                  {c.title.toLocaleUpperCase("tr-TR")}
                </div>
                <div className="mt-4 font-serif text-lg text-foreground">{c.audience}</div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/75">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lisans yolculuğu */}
      <section className="border-y border-border bg-card/40">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <div className="text-xs tracking-[0.3em] text-accent">LİSANS YOLCULUĞU</div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">Altı adımlı program</h2>
            </div>
            <ol className="space-y-10">
              {STAGES.map((s) => (
                <Stage key={s.num} num={s.num} title={s.title}>
                  <p>{s.body}</p>
                </Stage>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Lisansınızın ömrü */}
      <section className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">LİSANSINIZIN ÖMRÜ</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">
              Geçerlilik, tazeleme ve devamlılık
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {LIFECYCLE.map((l) => (
              <div key={l.title} className="border border-border bg-card p-7">
                <h3 className="font-serif text-xl text-primary">{l.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{l.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rozet karşılaştırması */}
      <section className="border-y border-border bg-card/40">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <div className="text-xs tracking-[0.3em] text-accent">ROZETLER</div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                PFA Practitioner ve PFA Fellow
              </h2>
            </div>
            <div className="overflow-x-auto border border-border bg-background">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/60 text-left">
                    <th className="px-4 py-3 font-normal text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      &nbsp;
                    </th>
                    <th className="px-4 py-3 font-serif text-base text-primary">
                      PFA Practitioner
                    </th>
                    <th className="px-4 py-3 font-serif text-base text-primary">PFA Fellow</th>
                  </tr>
                </thead>
                <tbody>
                  {BADGE_ROWS.map((r) => (
                    <tr key={r.label} className="border-b border-border/70 last:border-0">
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-normal text-foreground/75"
                      >
                        {r.label}
                      </th>
                      <td className="px-4 py-3 text-foreground/85">{r.practitioner}</td>
                      <td className="px-4 py-3 text-foreground/85">{r.fellow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-foreground/70">
              Seans ücretlerinizi kendiniz belirlersiniz ve doğrudan tahsil edersiniz. PFA
              seans gelirinize hiçbir şekilde ortak olmaz; komisyon yalnızca PFA BSÖ ve
              kurumsal paket satışlarında geçerlidir.
            </p>
          </div>
        </div>
      </section>

      {/* Ekosistem */}
      <section className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">EKOSİSTEM</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">
              Lisansınızla birlikte gelenler
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="relative flex flex-col border border-border bg-card p-6"
              >
                {f.badge && (
                  <span className="absolute right-3 top-3 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-accent">
                    {f.badge}
                  </span>
                )}
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-accent">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-serif text-lg text-primary">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Gereklilikler */}
      <section className="border-t border-border">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
            <div>
              <div className="text-xs tracking-[0.3em] text-accent">KİMLER BAŞVURABİLİR</div>
              <h3 className="mt-3 font-serif text-2xl md:text-3xl">Ön koşullar</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
                <li>
                  • İlgili alanda lisans/yüksek lisans diploması <em>veya</em>{" "}
                  belgelenebilir profesyonel sertifikasyon (ICF vb.) <em>veya</em> alanda
                  asgari 5 yıl belgelenebilir deneyim.
                </li>
                <li>• Danışan, öğrenci ya da ekiplerle aktif çalışıyor olmak.</li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-accent">
                Başvuru evrakları
              </div>
              <h3 className="mt-3 font-serif text-2xl md:text-3xl">Sunulacaklar</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
                <li>• Özgeçmiş (PDF)</li>
                <li>• Diploma / sertifika kopyası (PDF veya JPG)</li>
                <li>• Kısa niyet metni — neden PFA (formda metin alanı)</li>
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-3xl text-center text-xs italic leading-relaxed text-foreground/60">
            PFA uygulayıcı lisansı, mevcut mesleki yetkinliğinize bir metodoloji ekler; tek
            başına terapi, psikolojik danışmanlık veya sağlık hizmeti sunma yetkisi vermez.
          </p>
        </div>
      </section>

      {/* SSS */}
      <section className="border-t border-border bg-card/40">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <div className="text-xs tracking-[0.3em] text-accent">SIK SORULAN SORULAR</div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">Açık sorular, açık yanıtlar</h2>
            </div>
            <dl className="space-y-7">
              {FAQ.map((f) => (
                <div key={f.q} className="border-b border-border pb-6 last:border-0">
                  <dt className="font-serif text-lg text-primary">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-foreground/80">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Başvuru formu */}
      <section id="basvuru" className="border-t border-border scroll-mt-24">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-accent">Başvuru</div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                Uygulayıcı Programı Başvurusu
              </h2>
              <p className="mt-4 text-sm text-foreground/70">
                Değerlendirme yaklaşık 1–2 hafta içinde e-posta ile iletilir.
              </p>
              <p className="mt-2 text-sm text-foreground/70">
                Başvuru, PFA hesabınız üzerinden yapılır; böylece durumunuzu her an takip
                edebilirsiniz.
              </p>
            </div>
            <ApplicationCta />
          </div>
        </div>
      </section>

      {/* Kapanış bandı */}
      <section className="container-page py-14 text-center">
        <p className="mx-auto max-w-2xl font-serif text-lg text-foreground/85 md:text-xl">
          Rehberde yer alan her uygulayıcı bu sürecin tamamından geçer.
        </p>
        <Link
          to="/uygulayicilar"
          className="mt-6 inline-block text-xs tracking-[0.3em] text-accent underline underline-offset-4"
        >
          UYGULAYICI REHBERİ'Nİ GÖRÜNTÜLE
        </Link>
      </section>
    </main>
  );
}

function Stage({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid gap-5 border-l border-border pl-6 md:grid-cols-[auto_1fr] md:gap-8 md:pl-0 md:border-none">
      <div className="font-serif text-4xl leading-none text-accent md:text-5xl md:min-w-[4ch] md:text-right">
        {num}
      </div>
      <div>
        <h3 className="font-serif text-xl md:text-2xl">{title}</h3>
        <div className="mt-3 text-sm leading-relaxed text-foreground/80">{children}</div>
      </div>
    </li>
  );
}

function ApplicationCta() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const target = "/hesabim?tab=practitioner";

  return (
    <div className="mt-10 border border-border bg-background p-8 text-center">
      {signedIn ? (
        <Link
          to="/hesabim"
          search={{ tab: "practitioner" }}
          className="inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
        >
          Başvuru Yap
        </Link>
      ) : (
        <Link
          to="/auth"
          search={{ redirect: target }}
          className="inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
        >
          Başvuru Yap
        </Link>
      )}
      <p className="mt-4 text-xs text-foreground/60">
        Başvuru formu Hesabım → Uygulayıcı sekmesinde yer alır.
      </p>
    </div>
  );
}
