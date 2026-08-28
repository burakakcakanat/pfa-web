ALTER TABLE public.webinar_sessions ADD COLUMN IF NOT EXISTS target_vertical text;

DROP VIEW IF EXISTS public.webinar_sessions_public;
CREATE VIEW public.webinar_sessions_public
WITH (security_invoker = true) AS
 SELECT id, product_id, title, starts_at, capacity, banner_url, target_vertical, created_at
   FROM public.webinar_sessions;

GRANT SELECT ON public.webinar_sessions_public TO anon, authenticated;