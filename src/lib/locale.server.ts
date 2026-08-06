// Server-side origin-locale resolution for user-submitted records.
// The client may send a hint, but it is never trusted as free-form text:
// only "tr" or "en" are accepted, and the request referrer is used as a
// second, independent source. Anything else falls back to "tr".
import { getRequest } from "@tanstack/react-start/server";
import { localeFromPathname, type Locale } from "@/lib/i18n";

function fromReferer(): Locale | null {
  try {
    const ref = getRequest().headers.get("referer");
    if (!ref) return null;
    return localeFromPathname(new URL(ref).pathname);
  } catch {
    return null;
  }
}

/** Resolve the origin locale of a submission. Hint wins when valid, then referrer, else "tr". */
export function resolveLocale(hint?: string | null): Locale {
  if (hint === "en" || hint === "tr") return hint;
  return fromReferer() ?? "tr";
}
