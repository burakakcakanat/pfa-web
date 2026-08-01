CREATE TABLE public.license_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ulke','kurumsal')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organisation TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  role TEXT,
  message TEXT NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'yeni' CHECK (status IN ('yeni','incelemede','gorusme','kabul','red')),
  admin_note TEXT,
  ip_hash TEXT,
  -- ulke specific
  target_territory TEXT,
  existing_business_area TEXT,
  team_size INTEGER,
  years_in_field INTEGER,
  why_pfa TEXT,
  gtm_approach TEXT,
  -- kurumsal specific
  institution_type TEXT,
  current_programmes TEXT,
  annual_trainee_volume INTEGER,
  trainer_count INTEGER,
  intended_use TEXT,
  -- shared
  expected_timeline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_license_inquiries_type_created ON public.license_inquiries (type, created_at DESC);
CREATE INDEX idx_license_inquiries_email_created ON public.license_inquiries (email, created_at DESC);
CREATE INDEX idx_license_inquiries_ip_created ON public.license_inquiries (ip_hash, created_at DESC);

GRANT INSERT ON public.license_inquiries TO anon;
GRANT INSERT ON public.license_inquiries TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.license_inquiries TO authenticated;
GRANT ALL ON public.license_inquiries TO service_role;

ALTER TABLE public.license_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a license inquiry"
  ON public.license_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read license inquiries"
  ON public.license_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update license inquiries"
  ON public.license_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete license inquiries"
  ON public.license_inquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_license_inquiries_updated_at
  BEFORE UPDATE ON public.license_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();