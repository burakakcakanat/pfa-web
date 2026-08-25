CREATE OR REPLACE FUNCTION public.create_pro_invite(_client_name text)
 RETURNS pro_client_invites
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_acc public.practitioner_accounts;
  v_invite public.pro_client_invites;
  v_token text;
  v_mode text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_acc FROM public.practitioner_accounts WHERE user_id = v_uid FOR UPDATE;
  IF v_acc.user_id IS NULL THEN
    RAISE EXCEPTION 'PFA-Pro lisansı gerekli';
  END IF;

  -- Kota varsa ücretsiz (kotadan düşer); tükendiyse davet "paid" modda üretilir
  -- ve danışan indirimli olarak kendi ödemesini yapar.
  v_mode := CASE WHEN v_acc.client_used >= v_acc.client_quota THEN 'paid' ELSE 'kota' END;

  v_token := encode(extensions.gen_random_bytes(18), 'hex');

  INSERT INTO public.pro_client_invites (pro_user_id, client_name, token, status, mode)
  VALUES (v_uid, _client_name, v_token, 'pending', v_mode)
  RETURNING * INTO v_invite;

  IF v_mode = 'kota' THEN
    UPDATE public.practitioner_accounts
       SET client_used = client_used + 1
     WHERE user_id = v_uid;
  END IF;

  RETURN v_invite;
END;
$function$;

-- Kota düzenleme artık hesap bazlı (tek satır).
DROP FUNCTION IF EXISTS public.admin_set_client_quota(uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.admin_set_client_quota(_user_id uuid, _quota integer, _used integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.practitioner_accounts
     SET client_quota = GREATEST(_quota, 0), client_used = GREATEST(_used, 0)
   WHERE user_id = _user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_client_quota(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_client_quota(uuid, integer, integer) TO authenticated, service_role;