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
  v_is_gift boolean := false;
  v_recipient_name text;
  v_recipient_email text;
  v_gift_note text;
  v_token text;
  v_buyer_name text;
  v_buyer_email text;
BEGIN
  IF NEW.status <> 'paid' OR (OLD.status IS NOT NULL AND OLD.status = 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT slug, type INTO v_slug, v_product_type FROM public.products WHERE id = NEW.product_id;

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

  IF v_type IS NULL AND v_product_type = 'ebook' THEN
    v_type := 'ebook'::public.entitlement_type;
  END IF;

  v_is_gift := COALESCE((NEW.metadata->>'is_gift')::boolean, false);
  IF v_type = 'ebook' AND v_is_gift THEN
    v_recipient_name  := NEW.metadata->>'recipient_name';
    v_recipient_email := lower(NEW.metadata->>'recipient_email');
    v_gift_note       := NEW.metadata->>'gift_note';
    v_token := encode(extensions.gen_random_bytes(18), 'hex');
    INSERT INTO public.ebook_gifts (order_id, buyer_user_id, product_slug, recipient_name, recipient_email, gift_note, claim_token)
    VALUES (NEW.id, NEW.user_id, v_slug, COALESCE(v_recipient_name,''), COALESCE(v_recipient_email,''), v_gift_note, v_token)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  IF v_type IS NOT NULL THEN
    v_meta := jsonb_build_object('product_slug', v_slug);
    IF v_type = 'pfa_pro' THEN
      v_meta := v_meta || jsonb_build_object('client_quota', 20, 'client_used', 0);
    END IF;
    IF v_type = 'ebook' THEN
      SELECT full_name, email INTO v_buyer_name, v_buyer_email FROM public.profiles WHERE id = NEW.user_id;
      v_meta := v_meta || jsonb_build_object(
        'recipient_name', COALESCE(NULLIF(v_buyer_name,''), v_buyer_email, ''),
        'recipient_email', COALESCE(v_buyer_email, ''),
        'is_gift', false
      );
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