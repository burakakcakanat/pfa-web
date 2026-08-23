ALTER TABLE public.pro_client_invites
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'kota';

ALTER TABLE public.pro_client_invites
  ADD CONSTRAINT pro_client_invites_mode_check CHECK (mode IN ('kota','paid'));

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i integer;
  tries integer := 0;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_entitlements
       WHERE type = 'pfa_pro' AND metadata->>'referral_code' = v_code
    );
    tries := tries + 1;
    IF tries > 50 THEN
      RAISE EXCEPTION 'Referans kodu üretilemedi';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.gen_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gen_referral_code() TO service_role;

CREATE OR REPLACE FUNCTION public.create_pro_invite(_client_name text)
RETURNS pro_client_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ent public.user_entitlements;
  v_quota int;
  v_used int;
  v_invite public.pro_client_invites;
  v_token text;
  v_mode text;
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

  -- Kota varsa ücretsiz (kotadan düşer); tükendiyse davet "paid" modda üretilir
  -- ve danışan indirimli olarak kendi ödemesini yapar.
  v_mode := CASE WHEN v_used >= v_quota THEN 'paid' ELSE 'kota' END;

  v_token := encode(extensions.gen_random_bytes(18), 'hex');

  INSERT INTO public.pro_client_invites (pro_user_id, client_name, token, status, mode)
  VALUES (v_uid, _client_name, v_token, 'pending', v_mode)
  RETURNING * INTO v_invite;

  IF v_mode = 'kota' THEN
    UPDATE public.user_entitlements
    SET metadata = jsonb_set(metadata, '{client_used}', to_jsonb(v_used + 1))
    WHERE id = v_ent.id;
  END IF;

  RETURN v_invite;
END;
$$;