import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getPublicPractitioner,
  submitPractitionerInquiry,
  type PractitionerCategory,
  type PractitionerMode,
} from "@/lib/practitioners.functions";


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

const practitionerQuery = (id: string) =>
  queryOptions({
    queryKey: ["practitioner", id],
    queryFn: () => getPublicPractitioner({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/uygulayicilar/$id")({
  head: ({ loaderData }) => {
    const p = loaderData as any;
    const title = p?.full_name ? `${p.full_name} — PFA Uygulayıcı Rehberi` : "Uygulayıcı — PFA";
    const desc = p?.short_bio ??
      "PFA yaklaşımını uygulayan uygulayıcı profili.";
    const person: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: title,
      inLanguage: "tr",
      mainEntity: {
        "@type": "Person",
        name: p?.full_name,
        ...(p?.title ? { jobTitle: p.title } : {}),
        ...(p?.short_bio ? { description: p.short_bio } : {}),
        ...(p?.photo_url ? { image: p.photo_url } : {}),
        ...(p?.website ? { url: p.website } : {}),
        ...(p?.city || p?.country
          ? {
              address: {
                "@type": "PostalAddress",
                ...(p?.city ? { addressLocality: p.city } : {}),
                ...(p?.country ? { addressCountry: p.country } : {}),
              },
            }
          : {}),
        ...(Array.isArray(p?.specializations) && p.specializations.length
          ? { knowsAbout: p.specializations }
          : {}),
        ...(Array.isArray(p?.languages) && p.languages.length
          ? { knowsLanguage: p.languages }
          : {}),
      },
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
      ...(p?.full_name
        ? { scripts: [{ type: "application/ld+json", children: JSON.stringify(person) }] }
        : {}),
    };
  },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(practitionerQuery(params.id));
    if (!data) throw notFound();
    return data;
  },
  component: PractitionerDetail,
});

function PractitionerDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(practitionerQuery(id));
  const p = data!;

  return (
    <div className="container-page py-16 md:py-20">
      <div className="mb-8">
        <Link to="/uygulayicilar" className="text-sm text-muted-foreground hover:text-accent">
          ← Rehbere dön
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <aside>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-square w-full bg-muted">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-6xl text-muted-foreground">
                  {p.full_name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="space-y-1.5 p-5 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.65rem] tracking-[0.2em] text-accent">
                  {CATEGORY_LABEL[p.category].toLocaleUpperCase("tr-TR")}
                </span>
              </div>
              {p.city && (
                <div>
                  <span className="text-foreground/70">Şehir:</span> {p.city}
                  {p.country && p.country !== "Türkiye" ? `, ${p.country}` : ""}
                </div>
              )}
              {p.country && (
                <div>
                  <span className="text-foreground/70">Ülke:</span> {p.country}
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
              {p.website && (
                <div className="pt-2">
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent hover:underline"
                  >
                    Web sitesi
                  </a>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div>
          <div className="text-xs tracking-[0.3em] text-accent">
            {CATEGORY_LABEL[p.category].toLocaleUpperCase("tr-TR")}
          </div>
          <h1 className="mt-3 font-serif text-4xl text-primary md:text-5xl">{p.full_name}</h1>
          {p.title && <p className="mt-2 text-base text-muted-foreground">{p.title}</p>}

          {p.specializations.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {p.specializations.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {p.long_bio ? (
            <div className="prose prose-sm mt-8 max-w-none [overflow-wrap:anywhere] whitespace-pre-line text-foreground/85 leading-relaxed">
              {p.long_bio}
            </div>
          ) : p.short_bio ? (
            <p className="mt-8 [overflow-wrap:anywhere] text-sm leading-relaxed text-foreground/85">{p.short_bio}</p>
          ) : null}

          <div className="mt-12 rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl text-primary">Uygulayıcıya Ulaşın</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Mesajınız uygulayıcıya iletilir. E-posta üzerinden sizinle iletişime geçecektir.
            </p>
            <InquiryForm practitionerId={p.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InquiryForm({ practitionerId }: { practitionerId: string }) {
  const router = useRouter();
  const submit = useServerFn(submitPractitionerInquiry);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError("Mesajınız en az 10 karakter olmalı.");
      return;
    }
    setStatus("sending");
    try {
      await submit({
        data: {
          practitioner_id: practitionerId,
          sender_name: name,
          sender_email: email,
          message,
          website_hp: hp,
        },
      });
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
      router.invalidate();
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm text-foreground">
        Mesajınız uygulayıcıya iletildi. Uygulayıcı sizinle e-posta üzerinden iletişime geçecektir.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      {/* honeypot */}
      <input
        type="text"
        name="website_hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Adınız</label>
        <input
          type="text"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">E-posta</label>
        <input
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Mesajınız</label>
        <textarea
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary w-full disabled:opacity-60"
      >
        {status === "sending" ? "Gönderiliyor…" : "Mesaj Gönder"}
      </button>
    </form>
  );
}