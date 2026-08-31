UPDATE public.bundles
   SET pricing_mode = 'sum_minus_percent',
       price_override_cents = NULL,
       locked_to_product_slug = NULL
 WHERE pricing_mode <> 'sum_minus_percent'
    OR price_override_cents IS NOT NULL
    OR locked_to_product_slug IS NOT NULL;

COMMENT ON COLUMN public.bundles.pricing_mode IS 'KULLANIM DIŞI: tüm paketler sum_minus_percent modelindedir (kanonik: resolveBundlePriceInCurrency).';
COMMENT ON COLUMN public.bundles.locked_to_product_slug IS 'KULLANIM DIŞI — fiyat hesabına girmez.';
COMMENT ON COLUMN public.bundles.price_override_cents IS 'KULLANIM DIŞI — fiyat hesabına girmez.';