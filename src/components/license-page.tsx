// Shared presentational shell for the two licensing pages.
// All wording comes from the per-page COPY constants block.
import { LicenseInquiryForm, type LicenseFormCopy } from "@/components/license-inquiry-form";
import type { LicenseType } from "@/lib/license-inquiries";

export type LicensePageCopy = {
  eyebrow: string;
  h1: string;
  proposition: string;
  heroNote: string;
  ctaLabel: string;

  coversEyebrow: string;
  coversTitle: string;
  coversIntro: string;
  covers: Array<{ title: string; body: string }>;
  coversFootnote: string;

  audienceEyebrow: string;
  audienceTitle: string;
  audienceIntro: string;
  criteria: string[];
  notForTitle: string;
  notFor: string[];

  processEyebrow: string;
  processTitle: string;
  stages: Array<{ title: string; body: string }>;

  obligationsEyebrow: string;
  obligationsTitle: string;
  obligations: Array<{ title: string; body: string }>;
  nameUseTitle: string;
  nameUse: string[];

  faqEyebrow: string;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;

  formEyebrow: string;
  formTitle: string;
  formIntro: string;
  form: LicenseFormCopy;
};

export function LicensePage({ type, copy }: { type: LicenseType; copy: LicensePageCopy }) {
  return (
    <main className="bg-background text-foreground">
      {/* Hero */}
      <section className="container-page pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs tracking-[0.35em] text-accent">{copy.eyebrow}</div>
          <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">{copy.h1}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
            {copy.proposition}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/65">
            {copy.heroNote}
          </p>
          <a
            href="#basvuru"
            className="mt-9 inline-flex items-center justify-center rounded-none border border-primary bg-primary px-8 py-3 text-sm tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
          >
            {copy.ctaLabel}
          </a>
        </div>
      </section>

      {/* Lisans neyi kapsar */}
      <section className="container-page pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">{copy.coversEyebrow}</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">{copy.coversTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/75">
              {copy.coversIntro}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {copy.covers.map((c) => (
              <div key={c.title} className="flex h-full flex-col border border-border bg-card p-7">
                <div className="font-serif text-lg text-foreground">{c.title}</div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/75">{c.body}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-xs italic leading-relaxed text-foreground/60">
            {copy.coversFootnote}
          </p>
        </div>
      </section>

      {/* Kime uygun */}
      <section className="border-y border-border bg-card/40">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <div className="text-xs tracking-[0.3em] text-accent">{copy.audienceEyebrow}</div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">{copy.audienceTitle}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/75">
                {copy.audienceIntro}
              </p>
            </div>
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="font-serif text-2xl md:text-3xl">Aradığımız profil</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
                  {copy.criteria.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-serif text-2xl md:text-3xl">{copy.notForTitle}</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
                  {copy.notFor.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Süreç */}
      <section className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">{copy.processEyebrow}</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">{copy.processTitle}</h2>
          </div>
          <ol className="space-y-10">
            {copy.stages.map((s, i) => (
              <li
                key={s.title}
                className="grid gap-5 border-l border-border pl-6 md:grid-cols-[auto_1fr] md:gap-8 md:border-none md:pl-0"
              >
                <div className="font-serif text-4xl leading-none text-accent md:min-w-[4ch] md:text-right md:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-serif text-xl md:text-2xl">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Yükümlülükler */}
      <section className="border-y border-border bg-card/40">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <div className="text-xs tracking-[0.3em] text-accent">
                {copy.obligationsEyebrow}
              </div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">{copy.obligationsTitle}</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {copy.obligations.map((o) => (
                <div key={o.title} className="border border-border bg-background p-7">
                  <div className="font-serif text-lg">{o.title}</div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/75">{o.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12">
              <h3 className="font-serif text-2xl md:text-3xl">{copy.nameUseTitle}</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
                {copy.nameUse.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SSS */}
      <section className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <div className="text-xs tracking-[0.3em] text-accent">{copy.faqEyebrow}</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">{copy.faqTitle}</h2>
          </div>
          <dl className="divide-y divide-border border-y border-border">
            {copy.faq.map((f) => (
              <div key={f.q} className="py-6">
                <dt className="font-serif text-lg text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-foreground/75">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Başvuru */}
      <section id="basvuru" className="scroll-mt-24 border-t border-border bg-card/40">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-xs tracking-[0.3em] text-accent">{copy.formEyebrow}</div>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl">{copy.formTitle}</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-foreground/70">
                {copy.formIntro}
              </p>
            </div>
            <LicenseInquiryForm type={type} copy={copy.form} />
          </div>
        </div>
      </section>
    </main>
  );
}
