import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { ClipboardList, MessagesSquare, Plus } from "lucide-react";
import { CheckoutPanel } from "@/components/checkout-panel";
import { GiftModal } from "@/components/gift-modal";
import { PAYMENTS_LIVE } from "@/lib/payments-config";
import {
  addonSlugsForBook,
  fmtMoney,
  priceFor,
  type BundleShape,
  type Currency,
} from "@/lib/pricing";
import { getBooksData, type BooksPayload } from "@/lib/books.functions";
import {
  amazonUrlFor,
  bookSlugFor,
  fmtUsd,
  isLive,
  MARKETPLACE_NAMES,
  resolveBundlePrice,
} from "@/lib/bundles";
import hcdCover from "@/assets/hcd-cover.png.asset.json";

const booksQuery = () =>
  queryOptions({ queryKey: ["books-data"], queryFn: () => getBooksData(), staleTime: 0 });

export const Route = createFileRoute("/kitaplar")({
  head: ({ loaderData }: { loaderData?: BooksPayload }) => {
    const url = "https://psychofunctionalanalysis.com/kitaplar";
    const products = (loaderData?.products ?? []).filter((p) => p.active);
    const bookSchemas = products
      .filter((p) => p.book_key)
      .map((p) => ({
        "@context": "https://schema.org",
        "@type": "Book",
        name: p.name_tr,
        inLanguage: p.language,
        author: { "@type": "Person", name: "Burak Akçakanat" },
        ...(p.book_key === "pfa" && p.language === "en"
          ? { isbn: "9798188970468" }
          : {}),
        ...(p.cover_image_url ? { image: p.cover_image_url } : {}),
        offers: {
          "@type": "Offer",
          price: (p.price_cents / 100).toFixed(2),
          priceCurrency: p.currency || "USD",
          availability: "https://schema.org/InStock",
          url,
          seller: { "@type": "Organization", name: "Psiko-Fonksiyonel Analiz (PFA)" },
        },
      }));
    return {
      meta: [
        { title: "Kitaplar — PFA" },
        {
          name: "description",
          content:
            "Psycho-Functional Analysis kitapları: bilincin yedi seviyeli haritası ve modelin kökleri.",
        },
        { property: "og:title", content: "Kitaplar — PFA" },
        { property: "og:description", content: "PFA kitapları ve imzalı nüshalar." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: bookSchemas.map((s) => ({
        type: "application/ld+json",
        children: JSON.stringify(s),
      })),
    };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(booksQuery()),
  component: BooksPage,
});

const PFA_META = {
  key: "pfa",
  title: "Psycho-Functional Analysis",
  subtitle: "Bir Bilinç Haritası — Bekadan Aydınlanmaya",
  desc: "Yedi işlevsel seviye, yedi zekâ türü. Terapistler, koçlar, eğitimciler ve kendini anlamaya yola çıkmış herkes için bir yol bulma aracı.",
  covers: {
    tr: "https://static.wixstatic.com/media/db0c25_1409f60fe7f04746beef167966abdd57~mv2.png",
    en: "https://static.wixstatic.com/media/db0c25_5566b0e9d34045899974c8ac7c564552~mv2.png",
  } as Record<"tr" | "en", string>,
} as const;

const PFA_TR_META = {
  ...PFA_META,
  title: "Psiko-Fonksiyonel Analiz",
} as const;

const HCD_META = {
  key: "hcd",
  title: "Human Consciousness Decoded",
  subtitle: "Aydınlanmanın bilimi üzerine ilk eser — PFA modelinin kökleri.",
  desc: "Bilincin işleyişini bilim ve içgörü diliyle inceleyen erken dönem çalışma; PFA'nın entelektüel temeli.",
  covers: { en: hcdCover.url } as Record<"tr" | "en", string>,
} as const;

function BooksPage() {
  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-2xl text-center">
        <div className="text-xs tracking-[0.3em] text-accent">KİTAPLAR</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Haritanın kaynak metinleri</h1>
        <p className="mt-6 text-sm leading-relaxed text-foreground/75">
          İmzalı nüshalar yalnızca bu siteden edinilebilir; adınıza kişisel ithaf içerir.
        </p>
      </header>

      <Suspense fallback={<p className="mt-16 text-center text-sm text-muted-foreground">Yükleniyor…</p>}>
        <BooksContent />
      </Suspense>
    </div>
  );
}

function BooksContent() {
  const { data } = useSuspenseQuery(booksQuery());
  // TR yüzeyinde para birimi seçici yoktur — her zaman TRY.
  const [currency] = useState<Currency>("try");
  const addonLabels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of data.products) m[p.slug] = p.name_tr;
    return m;
  }, [data.products]);
  const bundleShapes = useMemo<BundleShape[]>(
    () =>
      data.bundles.map((b) => ({
        slug: b.slug,
        name_tr: b.name_tr,
        book_key: b.book_key,
        includes_book: b.includes_book,
        discount_percent: b.discount_percent,
        active: b.active,
        activate_at: b.activate_at ?? null,
        items: b.items.map((i) => ({ product_slug: i.product_slug, quantity: i.quantity ?? 1 })),
      })),
    [data.bundles],
  );
  const productBySlug = useMemo(() => {
    const m = new Map<string, BooksPayload["products"][number]>();
    for (const p of data.products) m.set(p.slug, p);
    return m;
  }, [data.products]);

  return (
    <div className="mt-16 space-y-24">
      {([
        [PFA_TR_META, "tr"],
        [PFA_META, "en"],
        [HCD_META, "en"],
      ] as const).map(([meta, lang]) => (
        <BookBlock
          key={`${meta.key}-${lang}`}
          meta={meta}
          lang={lang}
          data={data}
          productBySlug={productBySlug}
          currency={currency}
          addonLabels={addonLabels}
          bundleShapes={bundleShapes}
        />
      ))}
      <BundlesSection
        data={data}
        productBySlug={productBySlug}
        currency={currency}
        addonLabels={addonLabels}
        bundleShapes={bundleShapes}
      />
    </div>
  );
}

function BookBlock({
  meta,
  lang,
  data,
  productBySlug,
  currency,
  addonLabels,
  bundleShapes,
}: {
  meta: typeof PFA_META | typeof PFA_TR_META | typeof HCD_META;
  lang: "tr" | "en";
  data: BooksPayload;
  productBySlug: Map<string, BooksPayload["products"][number]>;
  currency: Currency;
  addonLabels: Record<string, string>;
  bundleShapes: BundleShape[];
}) {
  const productSlug = bookSlugFor(meta.key, lang);
  const product = productBySlug.get(productSlug);
  const productLive = product ? isLive(product) : false;

  const editions = data.editions
    .filter((e) => e.book_key === meta.key && e.language === lang)
    .sort((a, b) => a.sort_order - b.sort_order);

  const kindle = editions.find((e) => e.format === "kindle" && e.active && e.asin);
  const paperback = editions.find((e) => e.format === "paperback" && e.active && e.asin);
  const googlePlayRow = editions.find((e) => e.format === "google_play");
  const showGooglePlay = meta.key === "pfa" && lang === "tr";

  const resolvedPrice = priceFor(data.prices, productSlug, currency);
  const priceLabel = resolvedPrice
    ? fmtMoney(resolvedPrice.cents, resolvedPrice.currency)
    : product
      ? fmtUsd(product.price_cents)
      : "";

  const cover = product?.cover_image_url || meta.covers[lang] || meta.covers.en || "";
  const langLabel = lang === "tr" ? "Türkçe" : "İngilizce";

  return (
    <section className="grid gap-12 md:grid-cols-[minmax(240px,320px)_1fr] md:items-start">
      <div className="mx-auto w-full max-w-[280px] md:mx-0">
        <div className="aspect-[5/8] w-full overflow-hidden rounded-md border border-border bg-card shadow-[0_20px_50px_-30px_rgba(31,78,82,0.4)]">
          {cover ? (
            <img src={cover} alt={`${meta.title} kapağı`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-foreground/50">{meta.title}</div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          {meta.key === "pfa" ? "PFA · Kaynak Metin" : "HCD · Erken Dönem"} · {langLabel}
        </div>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">
          {meta.title}
          <span className="ml-3 align-middle rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-accent">
            {langLabel}
          </span>
        </h2>
        <p className="mt-3 font-serif italic text-foreground/75">{meta.subtitle}</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/80">{meta.desc}</p>

        {/* A — Siteden: İmzalı Nüsha */}
        {productLive && product && (
          <div className="mt-8 rounded-lg border border-accent/40 bg-accent/5 p-5">
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-accent">
              <span aria-hidden>✒</span> Siteden · İsme İmzalı Nüsha
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <div className="font-serif text-2xl text-primary">{priceLabel}</div>
              <div className="text-xs text-muted-foreground">
                PDF ve EPUB formatlarının ikisi birden · İsme imzalı nüsha
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BookBuyLauncher
                productSlug={productSlug}
                productTitle={meta.title}
                bookKey={meta.key}
                currency={currency}
                prices={data.prices}
                bundles={bundleShapes}
                addonLabels={addonLabels}
              />
              <GiftLauncher
                productSlug={productSlug}
                productTitle={meta.title}
                priceLabel={priceLabel}
                currency={currency}
              />
            </div>
          </div>
        )}

        {/* B — Amazon */}
        {(kindle || paperback) && (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">Amazon · Standart Baskı (İmzasız)</div>
            <div className="mt-3 space-y-2">
              {kindle && <AmazonRow label="Kindle" edition={kindle} />}
              {paperback && <AmazonRow label="Karton Kapak" edition={paperback} />}
            </div>
          </div>
        )}

        {/* C — Google Books (yalnız PFA · Türkçe) */}
        {showGooglePlay && (
          <div className="mt-4">
            {googlePlayRow && googlePlayRow.active && googlePlayRow.external_url ? (
              <a
                href={googlePlayRow.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
              >
                Google Books'ta gör →
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                Google Books · Yakında
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LangPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.15em] transition ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AmazonRow({ label, edition }: { label: string; edition: BooksPayload["editions"][number] }) {
  // Safari popup engelini aşmak için: onClick/window.open YOK.
  // Her ülke seçeneği render anında href hesaplanmış gerçek <a target="_blank"> olarak DOM'a giriyor.
  const options = edition.marketplaces
    .map((mk) => ({ mk, url: amazonUrlFor(mk, edition.asin, edition.overrides) }))
    .filter((o): o is { mk: string; url: string } => !!o.url);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-serif text-base">{label}</span>
      <details className="relative">
        <summary
          className="cursor-pointer list-none rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground marker:hidden focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Ülke seç…
        </summary>
        <ul
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-border bg-background shadow-lg"
        >
          {options.map(({ mk, url }) => (
            <li key={mk} role="none">
              <a
                role="menuitem"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-1.5 text-sm text-foreground hover:bg-accent/10 hover:text-accent"
              >
                {MARKETPLACE_NAMES[mk] ?? mk.toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function BookBuyLauncher(props: {
  productSlug: string;
  productTitle: string;
  bookKey: string;
  currency: Currency;
  prices: BooksPayload["prices"];
  bundles: BundleShape[];
  addonLabels: Record<string, string>;
  label?: string;
  initialAddons?: string[];
}) {
  const [open, setOpen] = useState(false);
  if (!PAYMENTS_LIVE) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="btn-primary cursor-not-allowed opacity-50"
      >
        Çok Yakında
      </button>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary hover:btn-primary-hover">
        {props.label ?? "İmzalı Nüshanı Al"}
      </button>
      <CheckoutPanel
        open={open}
        onClose={() => setOpen(false)}
        productSlug={props.productSlug}
        productTitle={props.productTitle}
        bookKey={props.bookKey}
        currency={props.currency}
        prices={props.prices}
        bundles={props.bundles}
        addonLabels={props.addonLabels}
        {...(props.initialAddons ? { initialAddons: props.initialAddons } : {})}
      />
    </>
  );
}

function GiftLauncher({
  productSlug,
  productTitle,
  priceLabel,
  currency,
}: {
  productSlug: string;
  productTitle: string;
  priceLabel: string;
  currency: Currency;
}) {
  const [open, setOpen] = useState(false);
  if (!PAYMENTS_LIVE) {
    return (
      <span className="cursor-not-allowed text-xs text-muted-foreground/70">
        Hediye Et · yakında
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground/70 underline decoration-accent decoration-1 underline-offset-4 hover:text-accent"
      >
        Hediye Et →
      </button>
      <GiftModal
        productSlug={productSlug}
        productTitle={productTitle}
        priceLabel={priceLabel}
        currency={currency}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ============ BUNDLES SECTION ============
function BundlesSection({
  data,
  productBySlug,
  currency,
  addonLabels,
  bundleShapes,
}: {
  data: BooksPayload;
  productBySlug: Map<string, BooksPayload["products"][number]>;
  currency: Currency;
  addonLabels: Record<string, string>;
  bundleShapes: BundleShape[];
}) {
  // NOT: HCD paketleri (hcd-seans-kitap vb.) activate_at = 2026-10-23 nedeniyle
  // burada görünmez. Bu bilinçli bir zamanlama; değiştirmeyin.
  const liveBundles = data.bundles.filter((b) => isLive(b));
  if (liveBundles.length === 0) return null;

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of data.products) m[p.slug] = p.price_cents;
    return m;
  }, [data.products]);

  return (
    <section className="border-t border-border pt-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Paketler</div>
        <h2 className="mt-4 font-serif text-3xl md:text-4xl">İmzalı kitapla birlikte</h2>
        <p className="mt-4 text-sm text-foreground/75">
          Kitap, PFA Ölçeği ve birebir seans — tek pakette.
        </p>
      </div>

      <div className="mt-12 space-y-8">
        {liveBundles.map((b) => (
          <BundleRow
            key={b.id}
            bundle={b}
            priceMap={priceMap}
            productBySlug={productBySlug}
            currency={currency}
            prices={data.prices}
            addonLabels={addonLabels}
            bundleShapes={bundleShapes}
          />
        ))}
      </div>
    </section>
  );
}

function BundleRow({
  bundle,
  priceMap,
  productBySlug,
  currency,
  prices,
  addonLabels,
  bundleShapes,
}: {
  bundle: BooksPayload["bundles"][number];
  priceMap: Record<string, number>;
  productBySlug: Map<string, BooksPayload["products"][number]>;
  currency: Currency;
  prices: BooksPayload["prices"];
  addonLabels: Record<string, string>;
  bundleShapes: BundleShape[];
}) {
  const [lang, setLang] = useState<"tr" | "en">(bundle.book_key === "hcd" ? "en" : "tr");
  const price = resolveBundlePrice(
    {
      pricing_mode: bundle.pricing_mode,
      locked_to_product_slug: bundle.locked_to_product_slug,
      discount_percent: bundle.discount_percent,
      price_override_cents: bundle.price_override_cents,
      includes_book: bundle.includes_book,
      book_key: bundle.book_key,
      items: bundle.items,
    },
    priceMap,
    lang,
  );

  // Para birimi duyarlı paket fiyatı: liste toplamı − discount_percent.
  // price_override_cents bilinçli olarak yok sayılır (tek para birimi varsayar).
  const bundleSlugs = [
    ...(bundle.includes_book ? [bookSlugFor(bundle.book_key, lang)] : []),
    ...bundle.items.map((i) => i.product_slug),
  ];
  let ccy: Currency = currency;
  let subtotal = 0;
  let priced = true;
  for (const s of bundleSlugs) {
    const p = priceFor(prices, s, ccy);
    if (!p) { priced = false; break; }
    if (p.currency !== ccy) ccy = "usd";
    subtotal += p.cents;
  }
  if (priced && ccy !== currency) {
    subtotal = bundleSlugs.reduce((sum, s) => sum + (priceFor(prices, s, ccy)?.cents ?? 0), 0);
  }
  const bundleTotal = Math.max(
    0,
    subtotal - Math.round((subtotal * Math.max(0, Math.min(100, bundle.discount_percent || 0))) / 100),
  );
  const bundlePriceLabel = priced ? fmtMoney(bundleTotal, ccy) : fmtUsd(price);

  const hasSession = bundle.items.some((i) => i.product_slug === "danismanlik-oturumu");
  const hasAssessment = bundle.items.some((i) => i.product_slug === "tam-assessment-rapor");

  // Görsel sırası: kitap → PFA Ölçeği → Seans (varsa)
  const bookProduct = bundle.includes_book
    ? productBySlug.get(bookSlugFor(bundle.book_key, lang))
    : null;
  const coverUrl =
    bookProduct?.cover_image_url ||
    (bundle.book_key === "hcd"
      ? HCD_META.covers.en
      : PFA_META.covers[lang] || PFA_META.covers.en);

  type Piece =
    | { kind: "book"; label: string }
    | { kind: "assessment"; label: string }
    | { kind: "session"; label: string };
  const pieces: Piece[] = [];
  if (bundle.includes_book) pieces.push({ kind: "book", label: "Kitap" });
  if (hasAssessment) pieces.push({ kind: "assessment", label: "PFA Ölçeği" });
  if (hasSession) pieces.push({ kind: "session", label: "Seans" });

  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-[0_20px_50px_-40px_rgba(31,78,82,0.4)] md:p-8">
      <div className="grid gap-8 md:grid-cols-[minmax(0,auto)_1fr] md:items-center">
        {/* Sol: bileşen görselleri dizisi */}
        <div className="flex items-end justify-center gap-3 md:justify-start">
          {pieces.map((piece, i) => (
            <div key={i} className="flex items-end gap-3">
              {piece.kind === "book" ? (
                <BookThumb src={coverUrl} alt={bookProduct?.name_tr ?? "Kitap"} label={piece.label} />
              ) : (
                <IconBadge
                  icon={piece.kind === "assessment" ? ClipboardList : MessagesSquare}
                  label={piece.label}
                />
              )}
              {i < pieces.length - 1 && (
                <Plus className="mb-6 h-4 w-4 shrink-0 text-accent/70" aria-hidden />
              )}
            </div>
          ))}
        </div>

        {/* Sağ: içerik */}
        <div className="flex min-w-0 flex-col">
          <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
            {bundle.book_key === "pfa" ? "PFA · Paket" : "HCD · Paket"}
          </div>
          <h3 className="mt-2 font-serif text-2xl text-primary md:text-3xl">
            {bundle.name_tr}
            {bundle.includes_book && (
              <span className="ml-3 inline-flex items-center gap-1 align-middle rounded-full border border-accent/50 bg-accent/10 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-accent">
                <span aria-hidden>✒</span> İmzalı Sürüm
              </span>
            )}
          </h3>

          {bundle.description_tr && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">
              {bundle.description_tr}
            </p>
          )}

          {bundle.book_key === "pfa" && bundle.includes_book && (
            <div className="mt-5 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Kitap dili:</span>
              <LangPill active={lang === "tr"} onClick={() => setLang("tr")}>Türkçe</LangPill>
              <LangPill active={lang === "en"} onClick={() => setLang("en")}>İngilizce</LangPill>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-baseline gap-4">
            <div className="font-serif text-3xl text-primary">{bundlePriceLabel}</div>
          </div>
          {hasSession && (
            <p className="mt-2 text-xs text-muted-foreground">
              Seansa katılan danışanlara imzalı nüsha eşlik eder.
            </p>
          )}

          <div className="mt-5">
            <BookBuyLauncher
              productSlug={bookSlugFor(bundle.book_key, lang)}
              productTitle={bundle.name_tr}
              bookKey={bundle.book_key}
              currency={currency}
              prices={prices}
              bundles={bundleShapes}
              addonLabels={addonLabels}
              label="Satın Al"
              initialAddons={bundle.items
                .map((i) => i.product_slug)
                .filter((s) => addonSlugsForBook(bundleShapes, bundle.book_key).includes(s))}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function BookThumb({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-[88px] w-[58px] overflow-hidden rounded-sm border border-border bg-card shadow-[0_10px_24px_-14px_rgba(31,78,82,0.55)]">
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-serif text-[0.55rem] text-foreground/40">
            {alt}
          </div>
        )}
      </div>
      <span className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    </div>
  );
}

function IconBadge({
  icon: Icon,
  label,
}: {
  icon: typeof ClipboardList;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid h-[72px] w-[72px] place-items-center rounded-full border border-accent/50 bg-accent/5 text-accent shadow-[0_10px_24px_-16px_rgba(31,78,82,0.5)]">
        <Icon className="h-7 w-7" strokeWidth={1.4} aria-hidden />
      </div>
      <span className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    </div>
  );
}
