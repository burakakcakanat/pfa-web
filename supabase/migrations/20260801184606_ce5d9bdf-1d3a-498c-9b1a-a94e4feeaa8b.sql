CREATE TABLE public.site_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size integer NOT NULL,
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  has_transparency boolean NOT NULL DEFAULT false,
  label text,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_media TO anon;
GRANT SELECT ON public.site_media TO authenticated;
GRANT ALL ON public.site_media TO service_role;

ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site media" ON public.site_media FOR SELECT USING (true);
CREATE POLICY "Admins can insert site media" ON public.site_media FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site media" ON public.site_media FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site media" ON public.site_media FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_media_set_updated_at BEFORE UPDATE ON public.site_media
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins manage site-media objects"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));