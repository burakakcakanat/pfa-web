-- 1) Practitioners: remove broad public row read; expose safe columns via definer view
DROP POLICY IF EXISTS "Public read published practitioners" ON public.practitioners;
ALTER VIEW public.practitioners_public SET (security_invoker = false);
GRANT SELECT ON public.practitioners_public TO anon, authenticated;

-- 2) Webinar sessions: hide join_url/notes from the public
DROP POLICY IF EXISTS "Anyone can view webinar sessions" ON public.webinar_sessions;
DROP POLICY IF EXISTS "Anyone signed in can view webinar sessions" ON public.webinar_sessions;

CREATE OR REPLACE VIEW public.webinar_sessions_public AS
  SELECT id, product_id, title, starts_at, capacity, banner_url, created_at
  FROM public.webinar_sessions;
ALTER VIEW public.webinar_sessions_public SET (security_invoker = false);
GRANT SELECT ON public.webinar_sessions_public TO anon, authenticated;

-- 3) License inquiries: submissions are inserted server-side only
DROP POLICY IF EXISTS "Anyone can submit a license inquiry" ON public.license_inquiries;
REVOKE INSERT ON public.license_inquiries FROM anon;

-- 4) SECURITY DEFINER functions must not be callable anonymously
REVOKE ALL ON FUNCTION public.can_view_assessment_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_sevenq_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_bundle_paid() FROM PUBLIC, anon, authenticated;