// Shared presentational shell for the legal pages (TR + EN).
// All wording comes from src/content/legal.ts.
import type { LegalCopy } from "@/content/legal";

const EMAIL = "info@psychofunctionalanalysis.com";

function withEmailLink(text: string) {
  if (!text.includes(EMAIL)) return text;
  const [before, after] = text.split(EMAIL);
  return (
    <>
      {before}
      <a className="text-accent hover:underline" href={`mailto:${EMAIL}`}>
        {EMAIL}
      </a>
      {after}
    </>
  );
}

export function LegalPage({ copy }: { copy: LegalCopy }) {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">{copy.eyebrow}</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">{copy.h1}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{copy.updated}</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-foreground/85">
          <p>{copy.intro}</p>
          {copy.sections.map((s) => (
            <section key={s.h2}>
              <h2 className="font-serif text-2xl text-primary">{s.h2}</h2>
              {s.paras.map((p, i) => (
                <p key={i} className="mt-3">
                  {withEmailLink(p)}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}