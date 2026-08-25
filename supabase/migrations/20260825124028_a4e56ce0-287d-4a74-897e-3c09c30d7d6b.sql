CREATE TABLE public.practitioner_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'practitioner' CHECK (tier IN ('practitioner','fellow')),
  referral_code text NOT NULL UNIQUE,
  client_quota int NOT NULL DEFAULT 0,
  client_used int NOT NULL DEFAULT 0,
  license_granted_at timestamptz,
  license_valid_until date,
  subscription_status text DEFAULT 'none' CHECK (subscription_status IN ('none','active','cancelled')),
  subscription_renews_at date,
  certificate_status text NOT NULL DEFAULT 'beklemede',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.practitioner_accounts TO authenticated;
GRANT ALL ON public.practitioner_accounts TO service_role;

ALTER TABLE public.practitioner_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage practitioner accounts"
  ON public.practitioner_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own practitioner account"
  ON public.practitioner_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER practitioner_accounts_updated
  BEFORE UPDATE ON public.practitioner_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();