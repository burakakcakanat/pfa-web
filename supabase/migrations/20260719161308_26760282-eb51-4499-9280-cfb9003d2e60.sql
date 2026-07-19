UPDATE public.products SET price_cents = 1199 WHERE slug = 'pfa-ebook-tr';

INSERT INTO public.products (slug, type, name_tr, name_en, description_tr, description_en, price_cents, currency, active)
VALUES
  ('pfa-ebook-en', 'ebook', 'Psycho-Functional Analysis (PFA) — E-Book', 'Psycho-Functional Analysis (PFA) — E-Book',
   'PFA''nın İngilizce dijital baskısı. Kişisel kullanım için lisanslıdır.',
   'PFA English digital edition. Personal use license.', 1199, 'usd', true),
  ('hcd-ebook-en', 'ebook', 'Human Consciousness Decoded — E-Book', 'Human Consciousness Decoded — E-Book',
   'HCD''nin İngilizce dijital baskısı. Kişisel kullanım için lisanslıdır.',
   'HCD English digital edition. Personal use license.', 999, 'usd', true)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_order_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slug TEXT;
  v_product_type public.product_type;
  v_type public.entitlement_type;
  v_meta jsonb;
BEGIN
  IF NEW.status <> 'paid' OR (OLD.status IS NOT NULL AND OLD.status = 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT slug, type INTO v_slug, v_product_type FROM public.products WHERE id = NEW.product_id;

  -- Client pack top-up: add 10 to buyer's most recent pfa_pro entitlement quota
  IF v_slug = 'client-pack-10' THEN
    UPDATE public.user_entitlements
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{client_quota}',
      to_jsonb(COALESCE((metadata->>'client_quota')::int, 0) + 10)
    )
    WHERE id = (
      SELECT id FROM public.user_entitlements
      WHERE user_id = NEW.user_id AND type = 'pfa_pro'
      ORDER BY created_at DESC LIMIT 1
    );
    RETURN NEW;
  END IF;

  v_type := CASE v_slug
    WHEN 'danismanlik-oturumu' THEN 'session'::public.entitlement_type
    WHEN 'bilinc-seviyeleri-calismalari' THEN 'webinar_bsc'::public.entitlement_type
    WHEN 'pfa-pro-lisans-paketi' THEN 'pfa_pro'::public.entitlement_type
    WHEN 'tam-assessment-rapor' THEN 'assessment_full'::public.entitlement_type
    ELSE NULL
  END;

  -- Any product of type 'ebook' grants an ebook entitlement, keyed by slug
  IF v_type IS NULL AND v_product_type = 'ebook' THEN
    v_type := 'ebook'::public.entitlement_type;
  END IF;

  IF v_type IS NOT NULL THEN
    v_meta := jsonb_build_object('product_slug', v_slug);
    IF v_type = 'pfa_pro' THEN
      v_meta := v_meta || jsonb_build_object('client_quota', 20, 'client_used', 0);
    END IF;
    INSERT INTO public.user_entitlements (user_id, type, source_order_id, metadata)
    VALUES (NEW.user_id, v_type, NEW.id, v_meta);
  END IF;

  IF v_slug = 'pfa-pro-lisans-paketi' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'pro')
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;