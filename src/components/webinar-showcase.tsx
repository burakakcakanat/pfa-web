// Webinar vitrini: üst şerit (tarih + hedef dikey), varsayılan torus banner'ı ve
// "diğer webinarlar" geri linki. Yalnızca sunum katmanı.
import { Link } from "@tanstack/react-router";
import { verticalLabel } from "@/lib/webinar-verticals";

export type ShowcaseSession = {
  id: string;
  title: string;
  starts_at: string;
  banner_url: string | null;
  target_vertical?: string | null;
} | null;

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
}

/** Görsel yüklenmemiş oturumlar için sade, stilize torus banner'ı. */
export function DefaultWebinarBanner({ title }: { title?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card">
      <svg viewBox="0 0 1200 380" className="h-auto w-full" role="img" aria-label={title ?? "PFA Webinar"}>
        <defs>
          <radialGradient id="wbg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.10" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="380" fill="url(#wbg)" className="text-accent" />
        <g
          transform="translate(600 190)"
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeOpacity="0.5"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <ellipse key={i} rx={40 + i * 22} ry={(40 + i * 22) / 2.6} strokeWidth={i === 7 ? 1.6 : 0.8} />
          ))}
          <circle r="10" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </div>
  );
}

export function WebinarShowcaseStrip({ session }: { session: ShowcaseSession }) {
  const date = fmtDate(session?.starts_at);
  const vertical = verticalLabel(session?.target_vertical);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.2em] text-accent">
      <span>PFA Webinarları</span>
      {date ? <span className="text-muted-foreground">· {date}</span> : null}
      {vertical ? <span className="text-muted-foreground">· {vertical}</span> : null}
    </div>
  );
}

export function OtherWebinarsLink() {
  return (
    <Link
      to="/webinarlar"
      className="mt-10 inline-block text-sm text-accent underline underline-offset-4"
    >
      ← Diğer webinarlar
    </Link>
  );
}

export function WebinarBanner({ session }: { session: ShowcaseSession }) {
  if (session?.banner_url) {
    return (
      <img
        src={session.banner_url}
        alt={session.title}
        className="mb-10 w-full rounded-lg border border-border shadow-sm"
      />
    );
  }
  return (
    <div className="mb-10">
      <DefaultWebinarBanner title={session?.title} />
    </div>
  );
}
