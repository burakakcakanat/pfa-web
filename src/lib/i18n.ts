// Locale foundation. English lives under the /en URL prefix; Turkish stays at the root.
// The language is always visible in the URL — never cookie-only.
export type Locale = "tr" | "en";

export const SITE_URL = "https://psychofunctionalanalysis.com";

export function localeFromPathname(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
}

/** Turkish path → its English counterpart. Only pages that exist in both languages. */
export const EN_COUNTERPART: Record<string, string> = {
  "/": "/en",
  "/kitaplar": "/en/books",
  "/hakkinda": "/en/about",
  "/iletisim": "/en/contact",
  "/iade-politikasi": "/en/refund-policy",
  "/kullanim-kosullari": "/en/terms",
  "/gizlilik": "/en/privacy",
};

/** English path → its Turkish counterpart. */
export const TR_COUNTERPART: Record<string, string> = Object.fromEntries(
  Object.entries(EN_COUNTERPART).map(([tr, en]) => [en, tr]),
);

function normalise(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Where the language switcher should send the visitor.
 * Pages without a counterpart fall back to the other language's home page,
 * so nobody lands on a half-translated page.
 */
export function switchTarget(pathname: string): string {
  const path = normalise(pathname);
  if (localeFromPathname(path) === "en") return TR_COUNTERPART[path] ?? "/";
  return EN_COUNTERPART[path] ?? "/en";
}

/** hreflang alternates for a page that exists in both languages (Turkish path given). */
export function alternateLinks(trPath: string) {
  const enPath = EN_COUNTERPART[trPath];
  if (!enPath) return [];
  return [
    { rel: "alternate", hrefLang: "tr", href: `${SITE_URL}${trPath}` },
    { rel: "alternate", hrefLang: "en", href: `${SITE_URL}${enPath}` },
    { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/` },
  ];
}

/** hreflang alternates for a page that exists in both languages (English path given). */
export function alternateLinksForEn(enPath: string) {
  const trPath = TR_COUNTERPART[enPath];
  if (!trPath) return [];
  return alternateLinks(trPath);
}