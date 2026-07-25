import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { BuyButton } from "@/components/buy-button";
import { GiftModal } from "@/components/gift-modal";
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
  queryOptions({ queryKey: ["books-data"], queryFn: () => getBooksData(), staleTime: 60_000 });

export const Route = createFileRoute("/kitaplar")({
  head: () => ({
    meta: [
      { title: "Kitaplar — PFA" },
      {
        name: "description",
        content:
          "Psycho-Functional Analysis kitapları: bilincin yedi seviyeli haritası ve modelin kökleri.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(booksQuery()),
  component: BooksPage,
});

const PFA_META = {
  key: "pfa",
  title: "Psycho-Functional Analysis",
  subtitle: "Bir bilinç haritası — bekadan birliğe.",
  desc: "Yedi işlevsel seviye, yedi zekâ türü. Terapistler, koçlar, eğitimciler ve kendini anlamaya yola çıkmış herkes için bir yol bulma aracı.",
  covers: {
    tr: "https://static.wixstatic.com/media/db0c25_1409f60fe7f04746beef167966abdd57~mv2.png",
    en: "https://static.wixstatic.com/media/db0c25_5566b0e9d34045899974c8ac7c564552~mv2.png",
  } as Record<"tr" | "en", string>,
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
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Kitaplar</div>
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
  const productBySlug = useMemo(() => {
    const m = new Map<string, BooksPayload["products"][number]>();
    for (const p of data.products) m.set(p.slug, p);
    return m;
  }, [data.products]);

  return (
    <div className="mt-16 space-y-24">
      <BookBlock meta={PFA_META} data={data} productBySlug={productBySlug} />
      <BookBlock meta={HCD_META} data={data} productBySlug={productBySlug} />
      <BundlesSection data={data} productBySlug={productBySlug} />
    </div>
  );
}

function BookBlock({
  meta,
  data,
  productBySlug,
}: {
  meta: typeof PFA_META | typeof HCD_META;
  data: BooksPayload;
  productBySlug: Map<string, BooksPayload["products"][number]>;
}) {
  const [lang, setLang] = useState<"tr" | "en">(meta.key === "hcd" ? "en" : "tr");
  const productSlug = bookSlugFor(meta.key, lang);
  const product = productBySlug.get(productSlug);
  const productLive = product ? isLive(product) : false;

  const editions = data.editions
    .filter((e) => e.book_key === meta.key)
    .sort((a, b) => a.sort_order - b.sort_order);

  const kindle = editions.find((e) => e.format === "kindle" && e.active && e.asin);
  const paperback = editions.find((e) => e.format === "paperback" && e.active && e.asin);
  const googlePlay = meta.key === "pfa" ? editions.find((e) => e.format === "google_play") : null;

  const cover = meta.covers[lang] ?? meta.covers.en ?? "";

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
          {meta.key === "pfa" ? "PFA · Kaynak Metin" : "HCD · Erken Dönem"}
        </div>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">{meta.title}</h2>
        <p className="mt-3 font-serif italic text-foreground/75">{meta.subtitle}</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/80">{meta.desc}</p>

        {/* A — Siteden: İmzalı Nüsha */}
        {productLive && product && (
          <div className="mt-8 rounded-lg border border-accent/40 bg-accent/5 p-5">
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-accent">
              <span aria-hidden>✒</span> Siteden · İsme İmzalı Nüsha
            </div>

            {meta.key === "pfa" && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Dil:</span>
                <LangPill active={lang === "tr"} onClick={() => setLang("tr")}>Türkçe</LangPill>
                <LangPill active={lang === "en"} onClick={() => setLang("en")}>English</LangPill>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <div className="font-serif text-2xl text-primary">{fmtUsd(product.price_cents)}</div>
              <div className="text-xs text-muted-foreground">PDF ve EPUB formatlarının ikisi birden.</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BuyButton productSlug={productSlug} label="İmzalı Nüshanı Al" />
              <GiftLauncher productSlug={productSlug} productTitle={meta.title} priceLabel={fmtUsd(product.price_cents)} />
            </div>
          </div>
        )}

        {/* B — Amazon */}
        {(kindle || paperback) && (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <div className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">Amazon · Standart Baskı</div>
            <div className="mt-3 space-y-2">
              {kindle && <AmazonRow label="Kindle" edition={kindle} />}
              {paperback && <AmazonRow label="Karton Kapak" edition={paperback} />}
            </div>
          </div>
        )}

        {/* C — Google Play (yalnız PFA) */}
        {meta.key === "pfa" && (
          <div className="mt-4">
            {googlePlay && googlePlay.active && googlePlay.external_url ? (
              <a
                href={googlePlay.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
              >
                Google Play Books'ta gör →
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                Google Play · Yakında
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-serif text-base">{label}</span>
      <select
        defaultValue=""
        onChange={(e) => {
          const mk = e.target.value;
          if (!mk) return;
          const url = amazonUrlFor(mk, edition.asin, edition.overrides);
          if (url) window.open(url, "_blank", "noopener,noreferrer");
          e.target.value = "";
        }}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Ülke seç…</option>
        {edition.marketplaces.map((mk) => (
          <option key={mk} value={mk}>
            {MARKETPLACE_NAMES[mk] ?? mk.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

function GiftLauncher({ productSlug, productTitle, priceLabel }: { productSlug: string; productTitle: string; priceLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground/70 underline decoration-accent decoration-1 underline-offset-4 hover:text-accent"
      >
        Hediye Et →
      </button>
      <GiftModal productSlug={productSlug} productTitle={productTitle} priceLabel={priceLabel} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ============ BUNDLES SECTION ============
function BundlesSection({
  data,
  productBySlug,
}: {
  data: BooksPayload;
  productBySlug: Map<string, BooksPayload["products"][number]>;
}) {
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
          Seansa katılan danışanlara imzalı nüsha eşlik eder.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {liveBundles.map((b) => (
          <BundleCard key={b.id} bundle={b} priceMap={priceMap} productBySlug={productBySlug} />
        ))}
      </div>
    </section>
  );
}

function BundleCard({
  bundle,
  priceMap,
  productBySlug,
}: {
  bundle: BooksPayload["bundles"][number];
  priceMap: Record<string, number>;
  productBySlug: Map<string, BooksPayload["products"][number]>;
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

  const hasSession = bundle.items.some((i) => i.product_slug === "danismanlik-oturumu");
  const componentNames = bundle.items.map((i) => productBySlug.get(i.product_slug)?.name_tr ?? i.product_slug);
  if (bundle.includes_book) {
    const bs = bookSlugFor(bundle.book_key, lang);
    const b = productBySlug.get(bs);
    if (b) componentNames.push(`${b.name_tr} — İmzalı Nüsha`);
  }

  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-[0_20px_50px_-40px_rgba(31,78,82,0.4)]">
      <h3 className="font-serif text-xl text-primary">{bundle.name_tr}</h3>
      {bundle.description_tr && (
        <p className="mt-2 text-sm text-foreground/75">{bundle.description_tr}</p>
      )}
      <ul className="mt-4 space-y-1 text-sm text-foreground/80">
        {componentNames.map((n, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent/70" aria-hidden />
            <span>{n}</span>
          </li>
        ))}
      </ul>

      {bundle.book_key === "pfa" && bundle.includes_book && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Kitap dili:</span>
          <LangPill active={lang === "tr"} onClick={() => setLang("tr")}>Türkçe</LangPill>
          <LangPill active={lang === "en"} onClick={() => setLang("en")}>English</LangPill>
        </div>
      )}

      <div className="mt-6 flex items-baseline gap-3">
        <div className="font-serif text-2xl text-primary">{fmtUsd(price)}</div>
      </div>
      {hasSession && (
        <p className="mt-2 text-xs text-muted-foreground">Seansa katılan danışanlara imzalı nüsha eşlik eder.</p>
      )}

      <div className="mt-5">
        <BuyButton
          bundleSlug={bundle.slug}
          bookLang={bundle.includes_book && bundle.book_key === "pfa" ? lang : undefined}
          label="Satın Al"
        />
      </div>
    </article>
  );
}
