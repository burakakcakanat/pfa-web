
-- Enums
CREATE TYPE public.practitioner_category AS ENUM ('terapotik','kocluk','pedagojik','kurumsal');
CREATE TYPE public.practitioner_mode AS ENUM ('online','yuz_yuze','her_ikisi');
CREATE TYPE public.practitioner_inquiry_status AS ENUM ('acik','yanitlandi');

-- Practitioners
CREATE TABLE public.practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  category public.practitioner_category NOT NULL,
  title text,
  photo_url text,
  short_bio text CHECK (short_bio IS NULL OR char_length(short_bio) <= 300),
  long_bio text,
  specializations text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  city text,
  country text NOT NULL DEFAULT 'Türkiye',
  mode public.practitioner_mode NOT NULL DEFAULT 'online',
  email text,
  website text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioners TO authenticated;
GRANT ALL ON public.practitioners TO service_role;
-- Not: anon SELECT verilmiyor; herkese açık okumalar practitioners_public görünümü üzerinden.

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage practitioners"
  ON public.practitioners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_practitioners_updated_at
  BEFORE UPDATE ON public.practitioners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public view (email excluded); readable by anon + authenticated
CREATE VIEW public.practitioners_public
WITH (security_invoker = false) AS
SELECT
  id, full_name, category, title, photo_url, short_bio, long_bio,
  specializations, languages, city, country, mode, website,
  sort_order, created_at
FROM public.practitioners
WHERE published = true;

GRANT SELECT ON public.practitioners_public TO anon, authenticated;

-- Inquiries
CREATE TABLE public.practitioner_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  message text NOT NULL,
  status public.practitioner_inquiry_status NOT NULL DEFAULT 'acik',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_inquiries TO authenticated;
GRANT INSERT ON public.practitioner_inquiries TO anon;
GRANT ALL ON public.practitioner_inquiries TO service_role;

ALTER TABLE public.practitioner_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can create an inquiry, but only for published practitioners.
CREATE POLICY "Anyone can send inquiry to published practitioner"
  ON public.practitioner_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners p
            WHERE p.id = practitioner_id AND p.published = true)
    AND char_length(sender_name) BETWEEN 1 AND 120
    AND char_length(sender_email) BETWEEN 3 AND 200
    AND char_length(message) BETWEEN 1 AND 4000
  );

CREATE POLICY "Admins read inquiries"
  ON public.practitioner_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update inquiries"
  ON public.practitioner_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete inquiries"
  ON public.practitioner_inquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_practitioner_inquiries_practitioner ON public.practitioner_inquiries(practitioner_id, created_at DESC);
CREATE INDEX idx_practitioners_sort ON public.practitioners(sort_order, created_at DESC) WHERE published = true;

-- Storage policies for practitioner-photos bucket
CREATE POLICY "Public read practitioner photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'practitioner-photos');

CREATE POLICY "Admins upload practitioner photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'practitioner-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update practitioner photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'practitioner-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete practitioner photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'practitioner-photos' AND public.has_role(auth.uid(), 'admin'));
