import { Link } from "@tanstack/react-router";
import type {
  BadgeTier,
  PractitionerCategory,
  PractitionerMode,
  PractitionerPublic,
} from "@/lib/practitioners.functions";

export const CATEGORY_LABEL: Record<PractitionerCategory, string> = {
  terapotik: "Terapötik",
  kocluk: "Koçluk",
  pedagojik: "Pedagojik",
  kurumsal: "Kurumsal",
};

export const MODE_LABEL: Record<PractitionerMode, string> = {
  online: "Online",
  yuz_yuze: "Yüz Yüze",
  her_ikisi: "Online / Yüz Yüze",
};

export const BADGE_LABEL: Record<BadgeTier, string> = {
  resident_fellow: "Resident Fellow",
  fellow: "PFA Fellow",
  practitioner: "PFA Practitioner",
};

/**
 * Uygulayıcı rehberi kartı — hem `/uygulayicilar` listesinde hem de
 * Hesabım → Uygulayıcı panelindeki önizlemede kullanılan tek gerçek kaynak.
 */
export function PractitionerCard({
  p,
  linkToProfile = true,
}: {
  p: PractitionerPublic;
  /** Panel önizlemesinde profil linki gösterilmez ister. */
  linkToProfile?: boolean;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-2xl text-muted-foreground">
              {p.full_name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] tracking-[0.2em] text-accent">
              {CATEGORY_LABEL[p.category].toLocaleUpperCase("tr-TR")}
            </span>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.6rem] tracking-[0.1em] text-accent">
              {BADGE_LABEL[p.badge_tier]}
            </span>
          </div>
          <h2 className="mt-1 font-serif text-xl text-primary">{p.full_name}</h2>
          {p.title && <p className="mt-1 text-xs text-muted-foreground">{p.title}</p>}
        </div>
      </div>
      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        {p.city && (
          <div>
            <span className="text-foreground/70">Şehir:</span> {p.city}
            {p.country && p.country !== "Türkiye" ? `, ${p.country}` : ""}
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
      </div>
      {p.short_bio && (
        <p className="mt-4 [overflow-wrap:anywhere] text-sm leading-relaxed text-foreground/85">
          {p.short_bio}
        </p>
      )}
      {linkToProfile && (
        <div className="mt-auto pt-5">
          <Link to="/uygulayicilar/$id" params={{ id: p.id }} className="btn-outline w-full">
            Profili Görüntüle
          </Link>
        </div>
      )}
    </article>
  );
}
