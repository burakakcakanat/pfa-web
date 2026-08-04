// Instagram bio link: instant server-side redirect to the right Amazon
// marketplace for the PFA English edition. No chrome, works logged out.
// Targets are always constructed server-side from the marketplace map —
// query parameters (including ?to=) are never used to build the target.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AMAZON_DOMAINS, amazonUrlFor } from "@/lib/bundles";

const SITE = "https://psychofunctionalanalysis.com";
const FALLBACK = "https://www.amazon.com/dp/B0H3BSWK1D";

// ISO country code → marketplace key used in book_editions.marketplaces
const COUNTRY_TO_MARKETPLACE: Record<string, string> = {
  US: "us",
  GB: "uk",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  MC: "fr",
  ES: "es",
  IT: "it",
  NL: "nl",
  PL: "pl",
  SE: "se",
  BE: "be",
  IE: "ie",
  JP: "jp",
  BR: "br",
  CA: "ca",
  MX: "mx",
  AU: "au",
  NZ: "au",
  IN: "in",
};

// Language subtag → marketplace, used when no country signal exists.
const LANG_TO_MARKETPLACE: Record<string, string> = {
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  nl: "nl",
  pl: "pl",
  sv: "se",
  ja: "jp",
  pt: "br",
  hi: "in",
  en: "us",
};

function countryFromHeaders(headers: Headers): string | null {
  const geo =
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("x-country-code") ||
    "";
  const code = geo.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") return code;

  // Accept-Language, e.g. "tr-TR,tr;q=0.9,en-US;q=0.8"
  const al = headers.get("accept-language") ?? "";
  const region = al.match(/[a-z]{2,3}-([A-Z]{2})/);
  if (region?.[1]) return region[1];
  return null;
}

function langFromHeaders(headers: Headers): string | null {
  const al = headers.get("accept-language") ?? "";
  const m = al.trim().toLowerCase().match(/^([a-z]{2,3})/);
  return m?.[1] ?? null;
}

async function resolveTarget(headers: Headers): Promise<string> {
  const country = countryFromHeaders(headers);

  // Turkey: no Amazon.com.tr listing — send to the Turkish books page.
  if (country === "TR" || (!country && langFromHeaders(headers) === "tr")) {
    return `${SITE}/kitaplar`;
  }

  const wanted =
    (country ? COUNTRY_TO_MARKETPLACE[country] : undefined) ??
    (LANG_TO_MARKETPLACE[langFromHeaders(headers) ?? ""] || "us");

  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await sb
      .from("book_editions")
      .select("format, asin, marketplaces, overrides, active, sort_order, book_key, language")
      .eq("book_key", "pfa")
      .eq("language", "en")
      .eq("active", true)
      .order("sort_order");

    const editions = (data ?? []).filter((e) => Boolean(e.asin));
    // Prefer kindle, then any other active edition.
    const ordered = [
      ...editions.filter((e) => e.format === "kindle"),
      ...editions.filter((e) => e.format !== "kindle"),
    ];

    for (const target of [wanted, "us"]) {
      for (const e of ordered) {
        const markets = (e.marketplaces ?? []) as string[];
        if (!markets.includes(target)) continue;
        if (!AMAZON_DOMAINS[target]) continue;
        const url = amazonUrlFor(
          target,
          e.asin ?? null,
          (e.overrides ?? {}) as Record<string, string>,
        );
        if (url) return url;
      }
    }
  } catch (e) {
    console.error("[buy] marketplace lookup failed", e);
  }
  return FALLBACK;
}

export const Route = createFileRoute("/buy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const location = await resolveTarget(request.headers);
        return new Response(null, {
          status: 302,
          headers: {
            Location: location,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      },
    },
  },
});