-- 1) Danışan profilleri
CREATE TABLE public.practitioner_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_user_id uuid NOT NULL,
  full_name text NOT NULL,
  birth_year integer,
  gender text,
  occupation text,
  city text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_clients TO authenticated;
GRANT ALL ON public.practitioner_clients TO service_role;

ALTER TABLE public.practitioner_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uygulayici kendi danisan profillerini yonetir"
  ON public.practitioner_clients FOR ALL TO authenticated
  USING (practitioner_user_id = auth.uid())
  WITH CHECK (practitioner_user_id = auth.uid());

CREATE POLICY "Admin tum danisan profilleri"
  ON public.practitioner_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX practitioner_clients_owner_idx
  ON public.practitioner_clients (practitioner_user_id, created_at DESC);

CREATE TRIGGER practitioner_clients_set_updated_at
  BEFORE UPDATE ON public.practitioner_clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Haftalik musaitlik
CREATE TABLE public.practitioner_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_availability TO authenticated;
GRANT ALL ON public.practitioner_availability TO service_role;

ALTER TABLE public.practitioner_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uygulayici kendi musaitligini yonetir"
  ON public.practitioner_availability FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin tum musaitlik satirlari"
  ON public.practitioner_availability FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX practitioner_availability_owner_idx
  ON public.practitioner_availability (user_id, weekday, start_time);

-- 3) Resident Fellow rozeti
ALTER TABLE public.practitioner_accounts DROP CONSTRAINT practitioner_accounts_tier_check;
ALTER TABLE public.practitioner_accounts
  ADD CONSTRAINT practitioner_accounts_tier_check
  CHECK (tier = ANY (ARRAY['practitioner'::text, 'fellow'::text, 'resident_fellow'::text]));

-- 3b) Komisyon orani secimi: resident_fellow -> fellow orani.
-- handle_order_paid icinde YALNIZCA tier CASE ifadeleri genisletildi.
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
  v_free_quota int;
  v_ref_uid uuid;
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
      v_free_quota := COALESCE(v_free_quota, 3);
      -- Tek gerçek kaynak: practitioner_accounts. Mevcut hesabın kotası ÜSTÜNE eklenir.
      INSERT INTO public.practitioner_accounts
        (user_id, tier, referral_code, client_quota, client_used, license_granted_at)
      VALUES (NEW.user_id, 'practitioner', public.gen_referral_code(), v_free_quota, 0, now())
      ON CONFLICT (user_id) DO UPDATE
        SET client_quota = public.practitioner_accounts.client_quota + v_free_quota,
            license_granted_at = COALESCE(public.practitioner_accounts.license_granted_at, now());
    END IF;

    IF v_type = 'ebook' THEN
      SELECT full_name, email INTO v_buyer_name, v_buyer_email FROM public.profiles WHERE id = NEW.user_id;
      v_meta := v_meta || jsonb_build_object(
        'recipient_name', COALESCE(NULLIF(v_buyer_name,''), v_buyer_email, ''),
        'recipient_email', COALESCE(v_buyer_email, ''),
        'is_gift', false
      );
    END IF;

    -- Mükerrer hak koruması: aynı sipariş + tip için ikinci kayıt oluşmaz.
    INSERT INTO public.user_entitlements (user_id, type, source_order_id, metadata)
    VALUES (NEW.user_id, v_type, NEW.id, v_meta)
    ON CONFLICT (source_order_id, type) WHERE source_order_id IS NOT NULL DO NOTHING;
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
    SELECT tier INTO v_tier FROM public.practitioner_accounts WHERE user_id = v_ref_uid;

    IF v_tier IS NOT NULL THEN
      SELECT value_numeric INTO v_rate FROM public.system_rates
       WHERE key = CASE WHEN v_tier IN ('fellow','resident_fellow') THEN 'komisyon.fellow' ELSE 'komisyon.practitioner' END;
      v_rate := COALESCE(v_rate, CASE WHEN v_tier IN ('fellow','resident_fellow') THEN 50 ELSE 25 END);

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
$function$;