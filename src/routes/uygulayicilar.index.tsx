import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listPublicPractitioners,
  type PractitionerPublic,
  type PractitionerCategory,
  type PractitionerMode,
} from "@/lib/practitioners.functions";

// TODO: En az 5-6 uygulayıcı yayına alındıktan sonra bu sayfayı ana menüye
// ("Uygulayıcılar" bağlantısı) tek satırla ekle — src/routes/__root.tsx NAV_LINKS.

const practitionersQuery = () =>
  queryOptions({
    queryKey: ["practitioners", "public"],
    queryFn: () => listPublicPractitioners(),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/uygulayicilar/")({
  head: () => ({
    meta: [
      { title: "PFA Uygulayıcı Rehberi — Psİko-Fonksİyonel Analİz" },
      {
        name: "description",
        content:
          "PFA yaklaşımını uygulayan, eğitim ve değerlendirme sürecinden geçmiş uygulayıcıların kürasyonlu rehberi.",
      },
      { property: "og:title", content: "PFA Uygulayıcı Rehberi" },
      {
        property: "og:description",
        content: "PFA yaklaşımını uygulayan uygulayıcıların kürasyonlu rehberi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(practitionersQuery()),
  component: PractitionersPage,
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

function PractitionersPage() {
  const { data } = useSuspenseQuery(practitionersQuery());
  const practitioners = data ?? [];

  const [category, setCategory] = useState<PractitionerCategory | "">("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("");
  const [mode, setMode] = useState<PractitionerMode | "">("");
  const [q, setQ] = useState("");

  const cities = useMemo(() => {
    const s = new Set<string>();
    for (const p of practitioners) if (p.city) s.add(p.city);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [practitioners]);

  const languages = useMemo(() => {
    const s = new Set<string>();
    for (const p of practitioners) for (const l of p.languages) s.add(l);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [practitioners]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLocaleLowerCase("tr");
    return practitioners.filter((p) => {
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
  }, [practitioners, category, city, language, mode, q]);

  return (
    <div className="container-page py-16 md:py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">UYGULAYICI REHBERİ</div>
        <h1 className="mt-3 font-serif text-4xl text-primary md:text-5xl">
          PFA Uygulayıcı Rehberi
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
          PFA yaklaşımını uygulayan, eğitim ve değerlendirme sürecinden geçmiş
          uygulayıcıların rehberidir. Liste PFA tarafından kürasyonla oluşturulur.
        </p>
      </header>

      {practitioners.length === 0 ? (
        <div className="mx-auto mt-16 max-w-lg rounded-lg border border-border bg-card px-8 py-12 text-center">
          <div className="font-serif text-xl text-primary">Rehber yakında yayında</div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            İlk uygulayıcılar kısa süre içinde bu sayfada yer alacak.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-12 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
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
              Bu filtrelerle eşleşen uygulayıcı bulunamadı.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <PractitionerCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PractitionerCard({ p }: { p: PractitionerPublic }) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-2xl text-muted-foreground">
              {p.full_name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] tracking-[0.2em] text-accent">
            {CATEGORY_LABEL[p.category].toLocaleUpperCase("tr-TR")}
          </div>
          <h2 className="mt-1 font-serif text-xl text-primary">{p.full_name}</h2>
          {p.title && <p className="mt-1 text-xs text-muted-foreground">{p.title}</p>}
        </div>
      </div>
      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        {p.city && (
          <div>
            <span className="text-foreground/70">Şehir:</span> {p.city}
            {p.country && p.country !== "Türkiye" ? `, ${p.country}` : ""}
          </div>
        )}
        {p.languages.length > 0 && (
          <div>
            <span className="text-foreground/70">Diller:</span> {p.languages.join(", ")}
          </div>
        )}
        <div>
          <span className="text-foreground/70">Görüşme:</span> {MODE_LABEL[p.mode]}
        </div>
      </div>
      {p.short_bio && (
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">{p.short_bio}</p>
      )}
      <div className="mt-auto pt-5">
        <Link
          to="/uygulayicilar/$id"
          params={{ id: p.id }}
          className="btn-outline w-full"
        >
          Profili Görüntüle
        </Link>
      </div>
    </article>
  );
}