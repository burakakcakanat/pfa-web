CREATE OR REPLACE FUNCTION public.handle_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_free_quota int;
  v_ref_uid uuid;
  v_ref_ent public.user_entitlements;
  v_tier text;
  v_rate numeric;
BEGIN
  IF NEW.status <> 'paid' OR (OLD.status IS NOT NULL AND OLD.status = 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT slug, type INTO v_slug, v_product_type FROM public.products WHERE id = NEW.product_id;

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
      SELECT value_numeric INTO v_free_quota FROM public.system_rates WHERE key = 'kota.ucretsiz_pfap';
      v_meta := v_meta || jsonb_build_object(
        'client_quota', COALESCE(v_free_quota, 3),
        'client_used', 0,
        'tier', 'practitioner',
        'referral_code', public.gen_referral_code()
      );
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

  -- Referans komisyonu: yalnızca ölçek (assessment / 7q) tipi ürünlerde.
  v_ref_uid := NULLIF(NEW.metadata->>'referring_practitioner_id','')::uuid;
  IF v_ref_uid IS NOT NULL
     AND (v_product_type = 'assessment'::public.product_type OR v_slug ILIKE '%7q%')
  THEN
    SELECT * INTO v_ref_ent FROM public.user_entitlements
     WHERE user_id = v_ref_uid AND type = 'pfa_pro'
     ORDER BY created_at DESC LIMIT 1;

    IF v_ref_ent.id IS NOT NULL THEN
      v_tier := COALESCE(v_ref_ent.metadata->>'tier', 'practitioner');
      SELECT value_numeric INTO v_rate FROM public.system_rates
       WHERE key = CASE WHEN v_tier = 'fellow' THEN 'komisyon.fellow' ELSE 'komisyon.practitioner' END;
      v_rate := COALESCE(v_rate, CASE WHEN v_tier = 'fellow' THEN 50 ELSE 25 END);

      INSERT INTO public.commission_ledger (
        practitioner_user_id, order_id, product_slug, tier_at_time,
        gross_amount_cents, currency, commission_rate_pct, commission_amount_cents, status
      ) VALUES (
        v_ref_uid, NEW.id, v_slug, v_tier,
        NEW.amount_cents, NEW.currency, v_rate,
        round(NEW.amount_cents * v_rate / 100.0)::int, 'tahakkuk'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;