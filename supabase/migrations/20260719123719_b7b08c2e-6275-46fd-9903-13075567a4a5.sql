
-- 1) Seed client-pack-10 product
INSERT INTO public.products (slug, name_tr, name_en, description_tr, type, price_cents, currency, active)
VALUES (
  'client-pack-10',
  'Danışan Ölçeği Ek Paketi (10)',
  'Client Assessment Pack (10)',
  '10 ek danışan ölçeği hakkı. Yalnızca PFA-Pro lisans sahipleri için.',
  'assessment',
  5000,
  'usd',
  true
) ON CONFLICT (slug) DO NOTHING;

-- 2) Rewrite order_paid handler to init pfa_pro quota and top up on client-pack-10
CREATE OR REPLACE FUNCTION public.handle_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug TEXT;
  v_type public.entitlement_type;
  v_meta jsonb;
BEGIN
  IF NEW.status <> 'paid' OR (OLD.status IS NOT NULL AND OLD.status = 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_slug FROM public.products WHERE id = NEW.product_id;

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
    WHEN 'pfa-ebook-tr' THEN 'ebook'::public.entitlement_type
    ELSE NULL
  END;

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

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_orders_paid ON public.orders;
CREATE TRIGGER trg_orders_paid
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_paid();

-- 3) RPC to create pro invite with atomic quota decrement
CREATE OR REPLACE FUNCTION public.create_pro_invite(_client_name text)
RETURNS public.pro_client_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ent public.user_entitlements;
  v_quota int;
  v_used int;
  v_invite public.pro_client_invites;
  v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ent FROM public.user_entitlements
  WHERE user_id = v_uid AND type = 'pfa_pro'
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;

  IF v_ent IS NULL THEN
    RAISE EXCEPTION 'PFA-Pro lisansı gerekli';
  END IF;

  v_quota := COALESCE((v_ent.metadata->>'client_quota')::int, 0);
  v_used  := COALESCE((v_ent.metadata->>'client_used')::int, 0);

  IF v_used >= v_quota THEN
    RAISE EXCEPTION 'QUOTA_EXHAUSTED';
  END IF;

  v_token := encode(gen_random_bytes(18), 'hex');

  INSERT INTO public.pro_client_invites (pro_user_id, client_name, token, status)
  VALUES (v_uid, _client_name, v_token, 'pending')
  RETURNING * INTO v_invite;

  UPDATE public.user_entitlements
  SET metadata = jsonb_set(metadata, '{client_used}', to_jsonb(v_used + 1))
  WHERE id = v_ent.id;

  RETURN v_invite;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_pro_invite(text) TO authenticated;

-- 4) Storage RLS for private 'ebooks' bucket:
--    - admins can do everything
--    - users with 'ebook' entitlement can SELECT (list/download via signed URL)
CREATE POLICY "Admins manage ebooks bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'ebooks' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'ebooks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Entitled users read ebooks"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ebooks'
  AND EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id = auth.uid() AND type = 'ebook'
  )
);
