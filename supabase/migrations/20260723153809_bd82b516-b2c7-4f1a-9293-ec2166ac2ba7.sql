
ALTER TABLE public.webinar_sessions ADD COLUMN IF NOT EXISTS banner_url text;

DROP POLICY IF EXISTS "Admins manage webinar banners" ON storage.objects;
CREATE POLICY "Admins manage webinar banners" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'webinar-banners' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'webinar-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
CREATE POLICY "Admins manage site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_site_settings_updated ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('social_instagram', ''),
  ('social_linkedin', ''),
  ('social_x', ''),
  ('social_youtube', '')
ON CONFLICT (key) DO NOTHING;
