import { useState } from "react";
import { BuyButton } from "./buy-button";

type Props = {
  productSlug: string;
  productTitle: string;
  priceLabel: string;
  open: boolean;
  onClose: () => void;
};

export function GiftModal({ productSlug, productTitle, priceLabel, open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const valid =
    trimmedName.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) &&
    note.length <= 200;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.3em] text-accent">HEDİYE ET</div>
            <h3 className="mt-2 font-serif text-2xl leading-tight">{productTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Alıcı adına imzalı bir nüsha hazırlanır ve claim bağlantısı size verilir.
            </p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="text-lg text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-foreground/80">Alıcının adı soyadı</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder="Ör: Ayşe Yılmaz"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-foreground/80">Alıcının e-postası</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder="alici@ornek.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-foreground/80">
              Kısa not (opsiyonel · en çok 200 karakter)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder="Bilinç yolculuğunda yol arkadaşın olsun…"
            />
            <span className="mt-1 block text-right text-[0.7rem] text-muted-foreground">
              {note.length}/200
            </span>
          </label>

          <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            Ödeme tamamlanınca <strong className="text-foreground/80">Hesabım → Satın Alımlarım</strong>{" "}
            bölümünde alıcı için özel bir <em>claim bağlantısı</em> göreceksiniz — bunu alıcıya iletebilirsiniz.
            (Otomatik e-posta gönderimi henüz aktif değil.)
          </div>

          {err && <div className="text-destructive">{err}</div>}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Vazgeç
            </button>
            {valid ? (
              <BuyButton
                productSlug={productSlug}
                label={`Hediye Et (${priceLabel})`}
                gift={{
                  recipient_name: trimmedName,
                  recipient_email: trimmedEmail,
                  gift_note: note.trim() || null,
                }}
                onSuccess={() => setErr(null)}
              />
            ) : (
              <button
                type="button"
                disabled
                className="btn-primary opacity-50"
                onClick={() => setErr("Ad ve geçerli bir e-posta gerekli.")}
              >
                Hediye Et ({priceLabel})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}