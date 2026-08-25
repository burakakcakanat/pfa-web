ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS webinar_audience text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS included_in_program boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD CONSTRAINT products_webinar_audience_check
  CHECK (webinar_audience IN ('general','practitioner'));

CREATE OR REPLACE FUNCTION public.register_free_program_webinar(_product_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prod public.products;
  v_tier text;
  v_order_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Giriş yapmalısınız'; END IF;
  IF NOT public.has_role(v_uid, 'pro') THEN RAISE EXCEPTION 'Bu webinar yalnızca uygulayıcılara açıktır'; END IF;

  SELECT * INTO v_prod FROM public.products WHERE slug = _product_slug;
  IF v_prod.id IS NULL THEN RAISE EXCEPTION 'Ürün bulunamadı'; END IF;
  IF v_prod.webinar_audience <> 'practitioner' OR NOT v_prod.included_in_program THEN
    RAISE EXCEPTION 'Bu webinar gelişim programına dahil değil';
  END IF;

  SELECT tier INTO v_tier FROM public.practitioner_accounts WHERE user_id = v_uid;
  IF COALESCE(v_tier, 'practitioner') <> 'fellow' THEN
    RAISE EXCEPTION 'Ücretsiz katılım yalnızca Fellow rozetine açıktır';
  END IF;

  SELECT id INTO v_order_id FROM public.orders
   WHERE user_id = v_uid AND product_id = v_prod.id AND status = 'paid'
   LIMIT 1;
  IF v_order_id IS NOT NULL THEN RETURN v_order_id; END IF;

  INSERT INTO public.orders (user_id, product_id, status, amount_cents, currency, provider, metadata)
  VALUES (v_uid, v_prod.id, 'paid', 0, COALESCE(v_prod.currency, 'usd'), 'program_included',
          jsonb_build_object('product_slug', v_prod.slug, 'program_included', true))
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_free_program_webinar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_free_program_webinar(text) TO authenticated, service_role;