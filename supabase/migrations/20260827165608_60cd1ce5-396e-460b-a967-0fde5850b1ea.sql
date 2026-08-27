CREATE TABLE public.practitioner_billing (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  iban text,
  fatura_unvani text,
  vergi_no text,
  vergi_dairesi text,
  adres text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_billing TO authenticated;
GRANT ALL ON public.practitioner_billing TO service_role;

ALTER TABLE public.practitioner_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_billing_select" ON public.practitioner_billing
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_billing_insert" ON public.practitioner_billing
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_billing_update" ON public.practitioner_billing
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_billing_all" ON public.practitioner_billing
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER practitioner_billing_set_updated_at
  BEFORE UPDATE ON public.practitioner_billing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();