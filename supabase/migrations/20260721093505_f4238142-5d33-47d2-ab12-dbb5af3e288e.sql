
-- 1) orders.metadata (gift bilgisi için)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Dedication şablonları
CREATE TABLE IF NOT EXISTS public.ebook_dedication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL UNIQUE,
  body_template text NOT NULL,
  footer_template text NOT NULL,
  signature_path text,
  author_name text NOT NULL DEFAULT 'Burak Akçakanat',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ebook_dedication_templates TO authenticated;
GRANT ALL ON public.ebook_dedication_templates TO service_role;
ALTER TABLE public.ebook_dedication_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dedication templates" ON public.ebook_dedication_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read dedication templates" ON public.ebook_dedication_templates
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_dedications_updated BEFORE UPDATE ON public.ebook_dedication_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ebook_dedication_templates (locale, body_template, footer_template) VALUES
  ('tr',
   'Bu kopya, {{FULL_NAME}} için hazırlanmıştır.'||chr(10)||'Bilinç yolculuğunuzda yol arkadaşınız olsun.',
   'Bu nüsha {{EMAIL}} adına lisanslanmıştır'),
  ('en',
   'This copy was prepared for {{FULL_NAME}}.'||chr(10)||'May it be a companion on your journey of consciousness.',
   'Licensed to {{EMAIL}}')
ON CONFLICT (locale) DO NOTHING;

-- 3) Hediye tablosu
CREATE TABLE IF NOT EXISTS public.ebook_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  gift_note text,
  claim_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed')),
  claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  personalized_pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gifts_buyer ON public.ebook_gifts(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_token ON public.ebook_gifts(claim_token);
GRANT SELECT ON public.ebook_gifts TO authenticated;
GRANT ALL ON public.ebook_gifts TO service_role;
ALTER TABLE public.ebook_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer or claimant sees gifts" ON public.ebook_gifts
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_user_id
      OR auth.uid() = claimed_by_user_id
      OR public.has_role(auth.uid(),'admin'));

-- 4) handle_order_paid — hediye dallanması + ebook ent. metadata
CREATE OR REPLACE FUNCTION public.handle_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
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
    v_token := encode(gen_random_bytes(18), 'hex');
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
$$;

-- 5) Claim gift RPC
CREATE OR REPLACE FUNCTION public.claim_ebook_gift(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_gift public.ebook_gifts;
  v_ent_id uuid;
  v_meta jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Giriş yapmalısınız'; END IF;

  SELECT * INTO v_gift FROM public.ebook_gifts WHERE claim_token = _token FOR UPDATE;
  IF v_gift.id IS NULL THEN RAISE EXCEPTION 'Geçersiz bağlantı'; END IF;

  IF v_gift.status = 'claimed' THEN
    IF v_gift.claimed_by_user_id = v_uid THEN
      SELECT id INTO v_ent_id FROM public.user_entitlements
        WHERE user_id = v_uid AND type='ebook' AND metadata->>'gift_id' = v_gift.id::text
        LIMIT 1;
      RETURN v_ent_id;
    END IF;
    RAISE EXCEPTION 'Bu hediye zaten kullanılmış';
  END IF;

  v_meta := jsonb_build_object(
    'product_slug', v_gift.product_slug,
    'recipient_name', v_gift.recipient_name,
    'recipient_email', v_gift.recipient_email,
    'is_gift', true,
    'gift_id', v_gift.id,
    'gift_from', v_gift.buyer_user_id,
    'gift_note', COALESCE(v_gift.gift_note,'')
  );

  INSERT INTO public.user_entitlements (user_id, type, source_order_id, metadata)
  VALUES (v_uid, 'ebook', v_gift.order_id, v_meta)
  RETURNING id INTO v_ent_id;

  UPDATE public.ebook_gifts SET status='claimed', claimed_by_user_id=v_uid, claimed_at=now()
    WHERE id = v_gift.id;

  RETURN v_ent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ebook_gift(text) TO authenticated;
