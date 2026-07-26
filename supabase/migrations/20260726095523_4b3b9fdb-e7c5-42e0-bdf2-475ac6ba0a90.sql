-- Enum: başvuru durumu
CREATE TYPE public.application_status AS ENUM ('yeni','incelemede','gorusme','kabul','red');

-- Tablo
CREATE TABLE public.practitioner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 4 AND 200),
  phone text,
  city text,
  category public.practitioner_category NOT NULL,
  profession_title text,
  experience_years integer,
  motivation text NOT NULL CHECK (char_length(motivation) BETWEEN 200 AND 1500),
  cv_path text,
  diploma_path text,
  kvkk_accepted boolean NOT NULL DEFAULT false,
  status public.application_status NOT NULL DEFAULT 'yeni',
  admin_note text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_practitioner_applications_created ON public.practitioner_applications (created_at DESC);
CREATE INDEX idx_practitioner_applications_email_created ON public.practitioner_applications (lower(email), created_at DESC);
CREATE INDEX idx_practitioner_applications_status ON public.practitioner_applications (status);

-- GRANTs (tabloya doğrudan anon SELECT yok; INSERT için gerekli)
GRANT INSERT ON public.practitioner_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.practitioner_applications TO authenticated;
GRANT ALL ON public.practitioner_applications TO service_role;

ALTER TABLE public.practitioner_applications ENABLE ROW LEVEL SECURITY;

-- Yeni başvuru: herkes ekleyebilir (durum 'yeni', kvkk true, admin_note null olmalı)
CREATE POLICY "applications_insert_public" ON public.practitioner_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'yeni'
    AND kvkk_accepted = true
    AND admin_note IS NULL
  );

-- Adminler tüm satırları görür ve güncelleyebilir
CREATE POLICY "applications_admin_select" ON public.practitioner_applications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "applications_admin_update" ON public.practitioner_applications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "applications_admin_delete" ON public.practitioner_applications
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER practitioner_applications_set_updated_at
  BEFORE UPDATE ON public.practitioner_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage: applicant-docs bucket için politikalar
-- Ziyaretçilerin doğrudan indirmesi/listelemesi YOK; yükleme yalnızca imzalı upload URL ile yapılacak.
-- Admin oturumu bucket içindeki dosyaları imzalı bağlantı üretmek için okuyabilir; service_role zaten atlar.

CREATE POLICY "applicant_docs_admin_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'applicant-docs' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "applicant_docs_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'applicant-docs' AND public.has_role(auth.uid(), 'admin')
  );
