import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BuyButton } from "@/components/buy-button";
import { useServerFn } from "@tanstack/react-start";
import { resolveProInvite } from "@/lib/invites.functions";
import { getPublicPrices } from "@/lib/site-settings.functions";
import { getActiveScaleItemCount } from "@/lib/assessment.functions";
import { fmtMoney, priceFor, type CurrencyPriceMap } from "@/lib/pricing";

type InviteInfo = Awaited<ReturnType<typeof resolveProInvite>>;

export const Route = createFileRoute("/degerlendirme")({
  validateSearch: (search: Record<string, unknown>): { invite?: string; ref?: string } => ({
    ...(typeof search.invite === "string" ? { invite: search.invite } : {}),
    ...(typeof search.ref === "string" ? { ref: search.ref.slice(0, 16) } : {}),
  }),
  loader: async () => {
    const [prices, itemCount] = await Promise.all([
      getPublicPrices({ data: { slugs: ["tam-assessment-rapor"] } }),
      getActiveScaleItemCount(),
    ]);
    return { prices, itemCount };
  },
  head: () => ({
    meta: [
      { title: "PFA Bilinç Seviyeleri Ölçeği | PFA" },
      {
        name: "description",
        content:
          "PFA Bilinç Seviyeleri Ölçeği: yedi bilinç seviyesini kapsayan madde havuzu; farkındalığı işlevsel farkındalığa taşıyan değerlendirme aracı.",
      },
      { property: "og:title", content: "PFA Bilinç Seviyeleri Ölçeği" },
      { property: "og:description", content: "PFA Bilinç Seviyeleri Ölçeği: bilinç seviyeleri için işlevsel değerlendirme aracı." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://psychofunctionalanalysis.com/degerlendirme" },
    ],
    links: [{ rel: "canonical", href: "https://psychofunctionalanalysis.com/degerlendirme" }],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { prices, itemCount } = Route.useLoaderData() as {
    prices: CurrencyPriceMap;
    itemCount: number;
  };
  const fullPrice = priceFor(prices ?? {}, "tam-assessment-rapor", "try");
  const [sent, setSent] = useState(false);
  const [hasFull, setHasFull] = useState(false);
  const { invite, ref } = Route.useSearch();
  const resolveInvite = useServerFn(resolveProInvite);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo>(null);

  useEffect(() => {
    if (!invite) return;
    (async () => {
      try {
        setInviteInfo(await resolveInvite({ data: { token: invite } }));
      } catch {
        setInviteInfo(null);
      }
    })();
  }, [invite, resolveInvite]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("user_entitlements")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("type", "assessment_full")
        .limit(1);
      setHasFull(!!data && data.length > 0);
    })();
  }, []);

  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">PFA ÖLÇEĞİ</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          PFA Bilinç Seviyeleri Ölçeği: Farkındalıktan İşlevsel Farkındalığa
        </h1>
        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          Resiflerde dalış yapan herkes anda ve farkındadır; ama yalnızca bir deniz
          biyoloğu hangi canlının neden renk değiştirdiğini görür. Bu fark,
          farkındalık ile işlevsel farkındalık arasındaki farktır. PFA Bilinç Seviyeleri Ölçeği bu
          geçişin aracıdır. Yedi bilinç seviyesini kapsayan {itemCount} maddelik havuz; hangi seviyede işlev
          aksadığını ve gelişimin nereden destek alacağını gösteren rapor. Bireysel
          gelişimden psikolojiye, eğitimden kurumsal seçme-yerleştirme-geliştirmeye
          uygulanabilir.
        </p>
      </header>

      {inviteInfo && (
        <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-accent/50 bg-accent/5 p-6 text-sm leading-relaxed">
          <div className="font-serif text-lg">
            {inviteInfo.practitioner_name
              ? `${inviteInfo.practitioner_name} sizi PFA Bilinç Seviyeleri Ölçeği'ne davet etti.`
              : "PFA Bilinç Seviyeleri Ölçeği'ne davet edildiniz."}
          </div>
          <p className="mt-2 text-foreground/80">
            {inviteInfo.mode === "kota"
              ? "Bu davet uygulayıcınızın kotasından karşılanıyor; ölçek sizin için ücretsizdir."
              : "Uygulayıcınızın ücretsiz danışan kotası tükenmiş. Ölçeği kendi adınıza, referans indirimi uygulanmış fiyattan tamamlayabilirsiniz."}
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 rounded-lg border border-accent/40 bg-accent/5 p-6 text-center md:flex-row md:justify-between md:text-left">
        <p className="text-sm leading-relaxed text-foreground/85">
          Başlangıç noktası: Ücretsiz Mini Ölçek ile 7 seviyede kendinize ilk bakışı
          atın, ardından dilerseniz tam ölçeğe geçin.
        </p>
        <Link to="/degerlendirme/mini" className="btn-primary shrink-0 whitespace-nowrap">
          Ücretsiz Ölçek
        </Link>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="text-xs tracking-[0.25em] text-accent">ÜCRETSİZ</div>
          <h2 className="mt-2 font-serif text-2xl">Mini Test</h2>
          <p className="mt-3 text-sm text-foreground/80">
            {itemCount} madde, 7 seviyede kısa bir görünüm. Sonucu görmek için ücretsiz üyelik gerekir.
          </p>
          <Link to="/degerlendirme/mini" className="btn-primary mt-6 inline-block">
            Ücretsiz Mini Testi Başlat
          </Link>
        </div>
        <div className="rounded-lg border-2 border-accent/50 bg-accent/5 p-8">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">
            {fullPrice ? fmtMoney(fullPrice.cents, fullPrice.currency) : "Fiyat yakında"}
          </div>
          <h2 className="mt-2 font-serif text-2xl">Tam Assessment + Bilinç Seviyesi Raporu</h2>
          <p className="mt-3 text-sm text-foreground/80">
            Tüm aktif sorular, seviye seviye ayrıntılı yorum, zeka türü skorları ve destek alınacak alanların derinlemesine haritası.
          </p>
          <div className="mt-6">
            {hasFull ? (
              <Link to="/degerlendirme/tam" className="btn-primary inline-block">
                Tam Testi Başlat
              </Link>
            ) : inviteInfo?.mode === "kota" ? (
              <Link to="/degerlendirme/tam" className="btn-primary inline-block">
                Davetli Ölçeği Başlat
              </Link>
            ) : (
              <BuyButton
                productSlug="tam-assessment-rapor"
                label="Tam Ölçeği Satın Al"
                refCode={inviteInfo?.referral_code ?? ref ?? null}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-2xl rounded-lg border border-border bg-card p-8 md:p-10">
        <h2 className="font-serif text-2xl">Ön Kayıt & Bilgi Talebi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ölçek erişimi ve rapor detayları için formu doldurun.
        </p>

        {sent ? (
          <div className="mt-8 rounded-md border border-accent/50 bg-accent/10 p-6 text-center">
            <div className="font-serif text-xl">Teşekkürler.</div>
            <p className="mt-2 text-sm text-foreground/80">
              Talebiniz alındı. En kısa sürede size dönüş yapacağız.
            </p>
          </div>
        ) : (
          <form
            className="mt-8 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Ad" name="firstName" required />
              <Field label="Soyad" name="lastName" required />
            </div>
            <Field label="E-posta" name="email" type="email" required />
            <Field label="Telefon (opsiyonel)" name="phone" type="tel" />
            <label className="grid gap-2 text-sm">
              <span className="text-foreground/80">
                Ölçeği hangi amaçla kullanmak istiyorsunuz?
              </span>
              <select
                required
                name="purpose"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Seçiniz…
                </option>
                <option>Bireysel gelişim</option>
                <option>Terapötik çalışma</option>
                <option>Kurumsal gelişim</option>
                <option>Eğitim ve pedagoji</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-foreground/80">Mesaj</span>
              <textarea
                name="message"
                rows={4}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <button type="submit" className="btn-primary hover:btn-primary-hover justify-self-start">
              Gönder
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-foreground/80">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}