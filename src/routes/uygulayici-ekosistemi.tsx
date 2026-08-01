import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  Megaphone,
} from "lucide-react";
import type {
  PractitionerCategory,
  PractitionerMode,
} from "@/lib/practitioners.functions";

// Bu sayfa menüde YER ALMAZ; yalnızca doğrudan bağlantıyla erişilir.
// noindex — arama motorlarında görünmesin.

export const Route = createFileRoute("/uygulayici-ekosistemi")({
  head: () => ({
    meta: [
      { title: "PFA Uygulayıcı Ekosistemi" },
      {
        name: "description",
        content:
          "Lisanslı PFA uygulayıcıları, ekosistemin araçlarına, içeriğine ve görünürlüğüne birlikte erişir.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "PFA Uygulayıcı Ekosistemi" },
      {
        property: "og:description",
        content:
          "Lisanslı PFA uygulayıcıları, ekosistemin araçlarına, içeriğine ve görünürlüğüne birlikte erişir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EcosystemPage,
});

const CATEGORY_LABEL: Record<PractitionerCategory, string> = {
  terapotik: "Terapötik",
  kocluk: "Koçluk",
  pedagojik: "Pedagojik",
  kurumsal: "Kurumsal",
};

const MODE_LABEL: Record<PractitionerMode, string> = {
  online: "Online",
  yuz_yuze: "Yüz Yüze",
  her_ikisi: "Online / Yüz Yüze",
};

type DemoPractitioner = {
  id: string;
  full_name: string;
  category: PractitionerCategory;
  title: string;
  city: string;
  country: string;
  languages: string[];
  mode: PractitionerMode;
  short_bio: string;
};

// Temsilî örnek veri — veritabanına HİÇBİR ŞEY YAZILMAZ, yalnızca önizleme.
const DEMO_PRACTITIONERS: DemoPractitioner[] = [
  {
    id: "demo-1",
    full_name: "Örnek Uygulayıcı — Terapötik",
    category: "terapotik",
    title: "Klinik Psikolog",
    city: "İstanbul",
    country: "Türkiye",
    languages: ["Türkçe", "İngilizce"],
    mode: "her_ikisi",
    short_bio:
      "Uzun yıllardır süregelen klinik deneyimini PFA haritasıyla birleştirerek bütüncül bir çerçevede çalışır.",
  },
  {
    id: "demo-2",
    full_name: "Örnek Uygulayıcı — Terapötik",
    category: "terapotik",
    title: "Psikoterapist",
    city: "Ankara",
    country: "Türkiye",
    languages: ["Türkçe"],
    mode: "yuz_yuze",
    short_bio:
      "Bireysel terapide bilinç düzeyleri modelini merkeze alan, süreç odaklı bir yaklaşımla çalışır.",
  },
  {
    id: "demo-3",
    full_name: "Örnek Uygulayıcı — Koçluk",
    category: "kocluk",
    title: "Yaşam ve Gelişim Koçu",
    city: "İzmir",
    country: "Türkiye",
    languages: ["Türkçe", "İngilizce"],
    mode: "online",
    short_bio:
      "Bireysel gelişim süreçlerinde PFA çerçevesini pratik hedeflerle harmanlar.",
  },
  {
    id: "demo-4",
    full_name: "Örnek Uygulayıcı — Koçluk",
    category: "kocluk",
    title: "Executive Koç",
    city: "İstanbul",
    country: "Türkiye",
    languages: ["Türkçe", "İngilizce"],
    mode: "her_ikisi",
    short_bio:
      "Yönetici gelişim programlarında PFA haritasını liderlik bağlamına taşır.",
  },
  {
    id: "demo-5",
    full_name: "Örnek Uygulayıcı — Pedagojik",
    category: "pedagojik",
    title: "Eğitim Danışmanı",
    city: "Bursa",
    country: "Türkiye",
    languages: ["Türkçe"],
    mode: "yuz_yuze",
    short_bio:
      "Çocuk ve ergen gelişiminde PFA çerçevesini aile görüşmeleriyle bütünleştirir.",
  },
  {
    id: "demo-6",
    full_name: "Örnek Uygulayıcı — Pedagojik",
    category: "pedagojik",
    title: "Rehber Öğretmen",
    city: "Ankara",
    country: "Türkiye",
    languages: ["Türkçe", "İngilizce"],
    mode: "online",
    short_bio:
      "Okul rehberlik süreçlerinde PFA ölçeğini destekleyici bir araç olarak kullanır.",
  },
  {
    id: "demo-7",
    full_name: "Örnek Uygulayıcı — Kurumsal",
    category: "kurumsal",
    title: "Kurumsal Gelişim Danışmanı",
    city: "İstanbul",
    country: "Türkiye",
    languages: ["Türkçe", "İngilizce"],
    mode: "her_ikisi",
    short_bio:
      "15 yıllık kurumsal gelişim deneyimini PFA haritasıyla birleştirir; ekip ve liderlik programları tasarlar.",
  },
  {
    id: "demo-8",
    full_name: "Örnek Uygulayıcı — Kurumsal",
    category: "kurumsal",
    title: "İK ve Kültür Danışmanı",
    city: "İzmir",
    country: "Türkiye",
    languages: ["Türkçe"],
    mode: "online",
    short_bio:
      "Kurum kültürü ve dönüşüm süreçlerinde PFA çerçevesini stratejik biçimde uygular.",
  },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Kendi Paneliniz",
    body: "Uygulayıcı paneliniz üzerinden tüm PFA çalışmanızı tek yerden yönetirsiniz.",
  },
  {
    icon: Users,
    title: "Danışan Yönetimi",
    body: "Danışanlarınızı davet eder, PFA Ölçeği süreçlerini ve sonuçlarını kendi panelinizden takip edersiniz.",
  },
  {
    icon: BookOpen,
    title: "Sürekli Beslenme",
    body: "PFA ekosisteminin zengin materyalleri, webinarları ve workshoplarıyla mesleki gelişiminiz süreklilik kazanır.",
  },
  {
    icon: CreditCard,
    title: "Site Üzerinden Ödeme Alma",
    body: "Danışan ödemelerinizi PFA altyapısı üzerinden alma imkânı.",
    soon: true,
  },
  {
    icon: Megaphone,
    title: "Sürekli Tanıtım ve Danışan Potansiyeli",
    body: "Uygulayıcı Rehberi'nde yer alır, PFA'nın büyüyen okur ve danışan kitlesine doğrudan görünür olursunuz.",
  },
] as const;

function EcosystemPage() {
  return (
    <main className="bg-background text-foreground">
      {/* 1. Hero */}
      <section className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs tracking-[0.3em] text-accent">
            PFA UYGULAYICI EKOSİSTEMİ
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-primary md:text-5xl">
            PFA uygulayıcısı olmak, bir rehberde listelenmekten fazlasıdır.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Lisanslı uygulayıcılar, PFA ekosisteminin araçlarına, içeriğine ve
            görünürlüğüne birlikte erişir. Bu sayfa, ekosistemin size neler
            sunduğunun kısa bir özetidir.
          </p>
        </div>
      </section>

      {/* 2. Özellik kutuları */}
      <section className="container-page pb-16 md:pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl text-primary md:text-4xl">
            Ekosistemde sizi neler bekliyor
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* 3. Rehber önizlemesi */}
      <section className="border-t border-border bg-muted/30">
        <div className="container-page py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs tracking-[0.3em] text-accent">
              ÖNİZLEME
            </div>
            <h2 className="mt-3 font-serif text-3xl text-primary md:text-4xl">
              Uygulayıcı Rehberi — Önizleme
            </h2>
          </div>
          <div className="mx-auto mt-6 max-w-3xl rounded-md border border-border bg-background/60 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
            Aşağıdaki profiller temsilîdir. Rehber, ilk uygulayıcılarımızın
            katılımıyla yayına alınacaktır.
          </div>
          <DirectoryPreview />
        </div>
      </section>

      {/* 4. Kapanış CTA */}
      <section className="container-page py-20">
        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="font-serif text-2xl text-primary md:text-3xl">
            Ekosisteme katılmak için ilk adım başvurudur.
          </h2>
          <div className="mt-8">
            <Link to="/uygulayici-olun" className="btn-primary inline-block px-8 py-3">
              Uygulayıcı Programına Başvurun
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Program aşamaları, gereklilikler ve başvuru formu için.
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  soon,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  body: string;
  soon?: boolean;
}) {
  return (
    <article className="relative flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
      {soon && (
        <span className="absolute right-3 top-3 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-accent">
          Yakında
        </span>
      )}
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 font-serif text-lg text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function DirectoryPreview() {
  const [category, setCategory] = useState<PractitionerCategory | "">("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("");
  const [mode, setMode] = useState<PractitionerMode | "">("");
  const [q, setQ] = useState("");

  const cities = useMemo(() => {
    const s = new Set<string>();
    for (const p of DEMO_PRACTITIONERS) if (p.city) s.add(p.city);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, []);

  const languages = useMemo(() => {
    const s = new Set<string>();
    for (const p of DEMO_PRACTITIONERS) for (const l of p.languages) s.add(l);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, []);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLocaleLowerCase("tr");
    return DEMO_PRACTITIONERS.filter((p) => {
      if (category && p.category !== category) return false;
      if (city && p.city !== city) return false;
      if (language && !p.languages.includes(language)) return false;
      if (mode) {
        if (mode === "online" && p.mode === "yuz_yuze") return false;
        if (mode === "yuz_yuze" && p.mode === "online") return false;
      }
      if (qLower && !p.full_name.toLocaleLowerCase("tr").includes(qLower)) return false;
      return true;
    });
  }, [category, city, language, mode, q]);

  return (
    <>
      <div className="mt-10 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ad ara…"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PractitionerCategory | "")}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tüm kategoriler</option>
          {(Object.keys(CATEGORY_LABEL) as PractitionerCategory[]).map((k) => (
            <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tüm şehirler</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tüm diller</option>
          {languages.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as PractitionerMode | "")}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tüm görüşme şekilleri</option>
          <option value="online">Online</option>
          <option value="yuz_yuze">Yüz Yüze</option>
          <option value="her_ikisi">Online / Yüz Yüze</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Bu filtrelerle eşleşen örnek profil bulunamadı.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <DemoPractitionerCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

function DemoPractitionerCard({ p }: { p: DemoPractitioner }) {
  const initial = CATEGORY_LABEL[p.category].slice(0, 1);
  return (
    <article className="relative flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
      <span className="absolute right-3 top-3 rounded-full border border-border bg-muted px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-muted-foreground">
        Örnek
      </span>
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-serif text-2xl text-muted-foreground">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] uppercase tracking-[0.2em] text-accent">
            {CATEGORY_LABEL[p.category]}
          </div>
          <h3 className="mt-1 font-serif text-xl text-primary">{p.full_name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{p.title}</p>
        </div>
      </div>
      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <div>
          <span className="text-foreground/70">Şehir:</span> {p.city}
        </div>
        <div>
          <span className="text-foreground/70">Diller:</span> {p.languages.join(", ")}
        </div>
        <div>
          <span className="text-foreground/70">Görüşme:</span> {MODE_LABEL[p.mode]}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-foreground/85">{p.short_bio}</p>
      <div className="mt-auto pt-5">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Örnek profil — gerçek profil sayfası yok"
          className="btn-outline w-full cursor-not-allowed opacity-50"
        >
          Profili Görüntüle
        </button>
      </div>
    </article>
  );
}