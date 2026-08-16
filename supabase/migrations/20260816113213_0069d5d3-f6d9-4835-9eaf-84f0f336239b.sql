CREATE TABLE public.product_prices (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('usd','try')),
  price_cents integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, currency)
);

GRANT SELECT ON public.product_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;

ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_prices_public_read"
  ON public.product_prices FOR SELECT
  USING (true);

CREATE POLICY "product_prices_admin_write"
  ON public.product_prices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_prices_set_updated_at
  BEFORE UPDATE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.product_prices (product_id, currency, price_cents, active)
SELECT id, 'usd', COALESCE(price_cents, 0), true
FROM public.products
WHERE lower(COALESCE(currency, 'usd')) = 'usd'
ON CONFLICT DO NOTHING;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_ref text;