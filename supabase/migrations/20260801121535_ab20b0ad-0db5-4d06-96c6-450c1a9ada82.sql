ALTER TABLE public.practitioner_applications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS practitioner_applications_user_id_idx
  ON public.practitioner_applications (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS practitioner_applications_one_active_per_user
  ON public.practitioner_applications (user_id)
  WHERE user_id IS NOT NULL AND status <> 'red'::application_status;

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS practitioners_user_id_key
  ON public.practitioners (user_id)
  WHERE user_id IS NOT NULL;

-- Applicants can read their own application status
DROP POLICY IF EXISTS applications_owner_select ON public.practitioner_applications;
CREATE POLICY applications_owner_select
  ON public.practitioner_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Replace anonymous insert with authenticated, self-owned insert
DROP POLICY IF EXISTS applications_insert_public ON public.practitioner_applications;
CREATE POLICY applications_insert_own
  ON public.practitioner_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'yeni'::application_status
    AND kvkk_accepted = true
    AND admin_note IS NULL
  );

GRANT SELECT, INSERT ON public.practitioner_applications TO authenticated;
GRANT ALL ON public.practitioner_applications TO service_role;
GRANT SELECT ON public.practitioners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioners TO authenticated;
GRANT ALL ON public.practitioners TO service_role;