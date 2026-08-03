// Kayıttaki gerçek alanlardan sosyal medya paylaşım metni üretir.
// Kural: burada uydurma bilgi yok — yalnızca verilen alanlar kullanılır.

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export const FREE_LABEL_TR = "Ücretsiz seminer";

export function formatWebinarPrice(priceCents: number | null | undefined): string {
  if (priceCents == null || priceCents <= 0) return FREE_LABEL_TR;
  return `$${(priceCents / 100).toFixed(0)}`;
}

export function formatIstanbul(iso: string): string {
  return TR_DATE.format(new Date(iso));
}

/** İlk anlamlı satırı (markdown işaretlerinden arınmış) döndürür. */
export function openingLine(text: string | null | undefined, max = 180): string {
  if (!text) return "";
  const line =
    text
      .split(/\n+/)
      .map((l) => l.replace(/^[#>*\-\s]+/, "").trim())
      .find((l) => l.length > 20) ?? "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

export type WebinarDraftInput = {
  title: string;
  startsAt: string;
  priceCents: number | null | undefined;
  notes?: string | null;
  url: string;
};

export type SocialDrafts = { linkedin: string; whatsapp: string; instagram: string };

export function buildWebinarDrafts(w: WebinarDraftInput): SocialDrafts {
  const date = formatIstanbul(w.startsAt);
  const price = formatWebinarPrice(w.priceCents);
  const desc = openingLine(w.notes ?? "");
  const descBlock = desc ? `${desc}\n\n` : "";

  const linkedin = [
    w.title,
    "",
    `Tarih: ${date} (İstanbul)`,
    `Katılım: ${price}`,
    "",
    descBlock.trim(),
    descBlock ? "" : null,
    `Ayrıntı ve kayıt: ${w.url}`,
  ]
    .filter((l) => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const whatsapp = `${w.title}\n${date} (İstanbul) · ${price}\n${w.url}`;

  const instagram = [
    w.title,
    "",
    `${date} (İstanbul)`,
    price,
    ...(desc ? ["", desc] : []),
    "",
    "Kayıt bağlantısı profilde 🔗",
  ].join("\n");

  return { linkedin, whatsapp, instagram };
}

export type PostDraftInput = {
  title: string;
  opening: string;
  url: string;
  siteLabel?: string;
};

/** Blog / podcast için Türkçe Instagram başlığı. */
export function buildInstagramCaptionTr(p: PostDraftInput): string {
  return [
    p.opening,
    "",
    p.title,
    "",
    `Yazının tamamı ${p.siteLabel ?? "psychofunctionalanalysis.com"} adresinde — bağlantı profilde 🔗`,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

/** İngilizce hesap için Instagram başlığı (İngilizce içerik varsa). */
export function buildInstagramCaptionEn(p: PostDraftInput): string {
  return [
    p.opening,
    "",
    p.title,
    "",
    `Read the full piece at ${p.siteLabel ?? "psychofunctionalanalysis.com"} — link in bio 🔗`,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

export function shareLinks(text: string, url: string) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}`,
  };
}
