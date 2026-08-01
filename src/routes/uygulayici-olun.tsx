import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
    value:
      "Danışan süreçlerinde bilinç haritasıyla seviye temelli derinlik.",
  },
  {
    key: "kocluk",
    title: "Koçluk",
    audience: "Profesyonel koçlar",
    value: "PFA Ölçeği ile ölçülebilir gelişim takibi ve seans mimarisi.",
  },
  {
    key: "pedagojik",
    title: "Pedagojik",
    audience: "Eğitimciler, akademisyenler",
    value:
      "Öğrenme ve gelişim süreçlerine seviye temelli işlevsel yaklaşım.",
  },
  {
    key: "kurumsal",
    title: "Kurumsal",
    audience: "İK, lider gelişimi, kurum danışmanları",
    value: "Ekip ve liderlik gelişimi için işlevsel bilinç haritası.",
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
            <div className="text-xs tracking-[0.3em] text-accent">
              KİME UYGUN
            </div>
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
                <div className="text-[11px] uppercase tracking-[0.28em] text-accent">
                  {c.title}
                </div>
                <div className="mt-4 font-serif text-lg text-foreground">
                  {c.audience}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                  {c.value}
                </p>
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
              <div className="text-xs tracking-[0.3em] text-accent">
                LİSANS YOLCULUĞU
              </div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                Dört aşamalı program
              </h2>
            </div>
            <ol className="space-y-10">
              <Stage
                num="01"
                title="Hazırlık — Oku, Dinle, İzle"
              >
                <p>
                  PFA kitabı (<em>Psİko-Fonksİyonel Analİz</em>), her seviye için bir
                  bölümden oluşan yedi bölümlük podcast serisi ve video içerikler.
                  Materyallerin çoğu çevrimiçidir; kendi hızınızda ilerlersiniz.
                </p>
                <p className="mt-3 text-sm text-foreground/70">
                  <Link to="/kitaplar" className="underline underline-offset-4">
                    Kitaplar sayfası
                  </Link>{" "}
                  ·{" "}
                  <Link to="/blog" className="underline underline-offset-4">
                    Podcastler
                  </Link>
                </p>
              </Stage>
              <Stage num="02" title="Uygulayıcı Sınavı">
                <p>
                  Hazırlık sürecinin ardından çevrimiçi uygulayıcı sınavı. Sınav
                  modülü ayrıca duyurulur; başvurunuz kabul edildikten sonra
                  erişim açılır.
                </p>
              </Stage>
              <Stage num="03" title="Değerlendirme Görüşmesi">
                <p>
                  Kurucu ya da eğitim direktörü ile birebir görüşme — alan
                  deneyimi, kategoriye özel uygulama biçimi ve etik çerçeve
                  üzerine.
                </p>
              </Stage>
              <Stage num="04" title="Sertifikasyon Webinarı">
                <p>
                  Kurucu Burak Akçakanat'ın yürüttüğü canlı webinar ile programın
                  tamamlanması; numaralı PFA uygulayıcı lisansı ve Uygulayıcı
                  Rehberi'nde yayın hakkı.
                </p>
              </Stage>
            </ol>
          </div>
        </div>
      </section>

      {/* Gereklilikler */}
      <section className="container-page py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
          <div>
            <div className="text-xs tracking-[0.3em] text-accent">
              KİMLER BAŞVURABİLİR
            </div>
            <h3 className="mt-3 font-serif text-2xl md:text-3xl">Ön koşullar</h3>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
              <li>
                • İlgili alanda lisans/yüksek lisans diploması <em>veya</em>{" "}
                belgelenebilir profesyonel sertifikasyon (ICF vb.) <em>veya</em>{" "}
                alanda asgari 3 yıl belgelenebilir deneyim.
              </li>
              <li>
                • Danışan, öğrenci ya da ekiplerle aktif çalışıyor olmak.
              </li>
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
          PFA uygulayıcı lisansı, mevcut mesleki yetkinliğinize bir metodoloji
          ekler; tek başına terapi, psikolojik danışmanlık veya sağlık hizmeti
          sunma yetkisi vermez.
        </p>
      </section>

      {/* Başvuru formu */}
      <section id="basvuru" className="border-t border-border bg-card/40 scroll-mt-24">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-accent">
                Başvuru
              </div>
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
        <div className="mt-3 text-sm leading-relaxed text-foreground/80">
          {children}
        </div>
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
