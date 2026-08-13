-- 1) Security definer views -> security invoker, with column-level grants
ALTER VIEW public.practitioners_public SET (security_invoker = true);
ALTER VIEW public.webinar_sessions_public SET (security_invoker = true);

GRANT SELECT (id, full_name, category, title, photo_url, short_bio, long_bio, specializations, languages, city, country, mode, website, sort_order, created_at, published)
  ON public.practitioners TO anon, authenticated;
GRANT SELECT (id, product_id, title, starts_at, capacity, banner_url, created_at)
  ON public.webinar_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read published practitioners" ON public.practitioners;
CREATE POLICY "Public can read published practitioners"
  ON public.practitioners FOR SELECT TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS "Public can read webinar sessions" ON public.webinar_sessions;
CREATE POLICY "Public can read webinar sessions"
  ON public.webinar_sessions FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.practitioners_public TO anon, authenticated;
GRANT SELECT ON public.webinar_sessions_public TO anon, authenticated;

-- 2) SECURITY DEFINER functions must not be callable by signed-out visitors
REVOKE ALL ON FUNCTION public.after_item_pool_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_item_pool() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_instrument_version(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.instrument_version_locked(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_instrument_version(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.instrument_version_locked(text) TO authenticated, service_role;

-- 3) site_media: no public read
DROP POLICY IF EXISTS "Anyone can view site media" ON public.site_media;
DROP POLICY IF EXISTS "Admins can view site media" ON public.site_media;
CREATE POLICY "Admins can view site media"
  ON public.site_media FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.site_media FROM anon;

-- 4) ebook_dedication_templates: admin-only (server code uses service role)
DROP POLICY IF EXISTS "Authenticated read dedication templates" ON public.ebook_dedication_templates;
REVOKE SELECT ON public.ebook_dedication_templates FROM anon;
