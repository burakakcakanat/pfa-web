import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout } from "@/lib/checkout.functions";

type Props = {
  productSlug?: string;
  bundleSlug?: string;
  bookLang?: "tr" | "en";
  label?: string;
  className?: string;
  gift?: { recipient_name: string; recipient_email: string; gift_note?: string | null } | null;
  onSuccess?: () => void;
};

export function BuyButton({ productSlug, bundleSlug, bookLang, label = "Satın Al", className, gift, onSuccess }: Props) {
  const doCheckout = useServerFn(createCheckout);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: window.location.pathname } });
        return;
      }
      const res = await doCheckout({
        data: {
          ...(productSlug ? { product_slug: productSlug } : {}),
          ...(bundleSlug ? { bundle_slug: bundleSlug } : {}),
          ...(bookLang ? { book_lang: bookLang } : {}),
          origin: window.location.origin,
          ...(gift ? { gift } : {}),
        },
      });
      if (res?.url) {
        onSuccess?.();
        window.location.href = res.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={className ?? "btn-primary hover:btn-primary-hover disabled:opacity-60"}
      >
        {loading ? "..." : label}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}