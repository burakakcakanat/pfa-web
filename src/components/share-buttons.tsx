import { useState } from "react";
import { Link2, Linkedin, MessageCircle, Share2 } from "lucide-react";
import { shareLinks } from "@/lib/social-drafts";

/**
 * Sessiz, site diline uygun paylaşım kontrolü.
 * Mobilde Web Share API, masaüstünde LinkedIn / WhatsApp / X + link kopyala.
 */
export function ShareButtons({
  title,
  url,
  className = "",
}: {
  title: string;
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(`${title} — ${url}`, url);

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* kullanıcı vazgeçti */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* kopyalanamadı */
    }
  };

  const canNative =
    typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  const item =
    "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs tracking-wide text-foreground/70 transition-colors hover:border-accent hover:text-accent";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="mr-1 text-xs tracking-[0.2em] text-muted-foreground">PAYLAŞ</span>
      {canNative && (
        <button type="button" onClick={nativeShare} className={item} aria-label="Paylaş">
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Paylaş
        </button>
      )}
      <a className={item} href={links.linkedin} target="_blank" rel="noopener noreferrer">
        <Linkedin className="h-3.5 w-3.5" aria-hidden="true" /> LinkedIn
      </a>
      <a className={item} href={links.whatsapp} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
      </a>
      <a className={item} href={links.x} target="_blank" rel="noopener noreferrer">
        <span aria-hidden="true" className="font-semibold">X</span> X
      </a>
      <button type="button" onClick={copy} className={item}>
        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        {copied ? "Kopyalandı" : "Linki kopyala"}
      </button>
    </div>
  );
}
