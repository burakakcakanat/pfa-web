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
            className="mt-9 inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
          >
            Başvuru Formuna Git
          </a>
        </div>
      </section>

      {/* Kime uygun */}
      <section className="container-page pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-accent">
              Kime uygun
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
              <div className="text-xs uppercase tracking-[0.3em] text-accent">
                Lisans Yolculuğu
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
            <div className="text-xs uppercase tracking-[0.3em] text-accent">
              Kimler başvurabilir
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
          className="mt-6 inline-block text-xs uppercase tracking-[0.3em] text-accent underline underline-offset-4"
        >
          Uygulayıcı Rehberi'ni görüntüle
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

function ApplicationForm() {
  const submit = useServerFn(submitPractitionerApplication);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [motivationLen, setMotivationLen] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    // Coerce checkbox to string
    fd.set("kvkk_accepted", (form.elements.namedItem("kvkk_accepted") as HTMLInputElement)?.checked ? "true" : "");
    try {
      await submit({ data: fd });
      setStatus("ok");
      form.reset();
      setMotivationLen(0);
    } catch (err: any) {
      const msg = err?.message ?? "Başvuru gönderilemedi.";
      // Zod issues gelirse ilkini göster
      setError(msg);
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="mt-10 border border-border bg-background p-8 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">
          Teşekkürler
        </div>
        <p className="mt-4 font-serif text-xl text-foreground">
          Başvurunuz alındı. Değerlendirme sonrası e-posta ile dönüş yapılacaktır.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-5" noValidate>
      {/* Honeypot */}
      <input
        type="text"
        name="website_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Ad Soyad" name="full_name" required maxLength={200} />
        <Field label="E-posta" name="email" type="email" required maxLength={200} />
        <Field label="Telefon (opsiyonel)" name="phone" type="tel" maxLength={60} />
        <Field label="Şehir" name="city" maxLength={120} />
        <div className="flex flex-col">
          <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">
            Kategori <span className="text-destructive">*</span>
          </label>
          <select
            name="category"
            required
            defaultValue=""
            className="border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="" disabled>
              Seçiniz
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <Field label="Mevcut unvan / meslek" name="profession_title" maxLength={200} />
        <Field
          label="Deneyim (yıl)"
          name="experience_years"
          type="number"
          min={0}
          max={80}
        />
      </div>

      <div className="flex flex-col">
        <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">
          Niyet metni <span className="text-destructive">*</span>{" "}
          <span className="ml-2 text-[10px] tracking-normal text-foreground/50">
            (200–1500 karakter · {motivationLen})
          </span>
        </label>
        <textarea
          name="motivation"
          required
          minLength={200}
          maxLength={1500}
          rows={7}
          onChange={(e) => setMotivationLen(e.target.value.length)}
          placeholder="Neden PFA uygulayıcı olmak istediğinizi kısaca aktarın."
          className="border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FileField
          label="Özgeçmiş (PDF, ≤10MB)"
          name="cv"
          accept="application/pdf"
          required
        />
        <FileField
          label="Diploma / sertifika (PDF/JPG, opsiyonel, ≤10MB)"
          name="diploma"
          accept="application/pdf,image/jpeg,image/png"
        />
      </div>

      <label className="flex items-start gap-3 pt-2 text-sm text-foreground/85">
        <input
          type="checkbox"
          name="kvkk_accepted"
          required
          className="mt-1 h-4 w-4 accent-primary"
        />
        <span>
          Kişisel verilerimin başvuru değerlendirmesi amacıyla işlenmesini kabul
          ediyorum.{" "}
          <Link to="/hakkinda" className="underline underline-offset-4">
            KVKK aydınlatma metni
          </Link>
        </span>
      </label>

      {status === "error" && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="pt-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {status === "sending" ? "Gönderiliyor…" : "Başvuruyu Gönder"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        {...rest}
        className="border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function FileField({
  label,
  name,
  accept,
  required,
}: {
  label: string;
  name: string;
  accept: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs uppercase tracking-[0.2em] text-foreground/70">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.2em] file:text-primary hover:file:bg-primary/20"
      />
    </div>
  );
}
