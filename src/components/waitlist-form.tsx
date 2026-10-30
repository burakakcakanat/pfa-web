import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WAITLIST_BOOKS } from "@/lib/waitlist";

export type WaitlistEntry = {
  product_slug: string;
  is_gift: boolean;
  recipient_name: string;
  recipient_email: string;
  gift_note: string;
  dedication_name: string;
};

export const emptyEntry = (slug = "pfa-ebook-tr", gift = false): WaitlistEntry => ({
  product_slug: slug,
  is_gift: gift,
  recipient_name: "",
  recipient_email: "",
  gift_note: "",
  dedication_name: "",
});

export function WaitlistForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  busy,
  error,
}: {
  value: WaitlistEntry;
  onChange: (v: WaitlistEntry) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
}) {
  const set = <K extends keyof WaitlistEntry>(k: K, v: WaitlistEntry[K]) => onChange({ ...value, [k]: v });
  const [touched, setTouched] = useState(false);
  const giftMissing = value.is_gift && (!value.recipient_name.trim() || !value.recipient_email.trim());

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!giftMissing) onSubmit();
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-foreground">Kitap</legend>
        {WAITLIST_BOOKS.map((b) => (
          <label
            key={b.slug}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition ${
              value.product_slug === b.slug ? "border-accent bg-accent/5" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="book"
              className="accent-[hsl(var(--accent))]"
              checked={value.product_slug === b.slug}
              onChange={() => set("product_slug", b.slug)}
            />
            {b.label}
          </label>
        ))}
      </fieldset>

      <div>
        <Label htmlFor="wl-ded">İthaf edilecek ad</Label>
        <Input
          id="wl-ded"
          value={value.dedication_name}
          onChange={(e) => set("dedication_name", e.target.value)}
          placeholder={value.is_gift ? "Alıcının adı (boş bırakılırsa alıcı adı kullanılır)" : "Kendi adınız"}
        />
        <p className="mt-1 text-xs text-muted-foreground">Kitabın ilk sayfasına bu adla imzalı ithaf eklenir.</p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label htmlFor="wl-gift" className="cursor-pointer">Hediye olarak göndermek istiyorum</Label>
        <Switch id="wl-gift" checked={value.is_gift} onCheckedChange={(v) => set("is_gift", v)} />
      </div>

      {value.is_gift && (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/30 p-3">
          <div>
            <Label htmlFor="wl-rn">Alıcının adı</Label>
            <Input id="wl-rn" value={value.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="wl-re">Alıcının e-postası</Label>
            <Input id="wl-re" type="email" value={value.recipient_email} onChange={(e) => set("recipient_email", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="wl-note">Hediye notu (isteğe bağlı)</Label>
            <Textarea id="wl-note" rows={3} value={value.gift_note} onChange={(e) => set("gift_note", e.target.value)} />
          </div>
          {touched && giftMissing && (
            <p className="text-xs text-destructive">Hediye için alıcının adı ve e-postası gerekli.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary hover:btn-primary-hover w-full disabled:opacity-60">
        {busy ? "..." : submitLabel}
      </button>
    </form>
  );
}
