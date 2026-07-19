
CREATE TABLE IF NOT EXISTS public.webinar_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  capacity int,
  join_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webinar_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_sessions TO authenticated;
GRANT ALL ON public.webinar_sessions TO service_role;

ALTER TABLE public.webinar_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can view webinar sessions" ON public.webinar_sessions;
CREATE POLICY "Anyone signed in can view webinar sessions"
  ON public.webinar_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage webinar sessions" ON public.webinar_sessions;
CREATE POLICY "Admins manage webinar sessions"
  ON public.webinar_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_webinar_sessions_updated ON public.webinar_sessions;
CREATE TRIGGER trg_webinar_sessions_updated
  BEFORE UPDATE ON public.webinar_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin RPC: update an entitlement's client quota metadata
CREATE OR REPLACE FUNCTION public.admin_set_client_quota(
  _entitlement_id uuid, _quota int, _used int
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.user_entitlements
     SET metadata = COALESCE(metadata,'{}'::jsonb)
                    || jsonb_build_object('client_quota', _quota, 'client_used', _used)
   WHERE id = _entitlement_id;
END;
$$;
