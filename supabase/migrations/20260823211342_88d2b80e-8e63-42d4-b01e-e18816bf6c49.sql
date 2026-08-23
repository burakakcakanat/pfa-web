CREATE TABLE public.commission_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  currency text NOT NULL,
  total_amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'taslak' CHECK (status IN ('taslak','fatura_bekleniyor','odemeye_hazir','odendi')),
  fatura_alindi_at timestamptz,
  odeme_tarihi date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  product_slug text,
  tier_at_time text,
  gross_amount_cents integer NOT NULL,
  currency text NOT NULL,
  commission_rate_pct numeric NOT NULL,
  commission_amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'tahakkuk' CHECK (status IN ('tahakkuk','ekstreye_alindi','odendi')),
  statement_id uuid REFERENCES public.commission_statements(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commission_ledger_practitioner_idx ON public.commission_ledger (practitioner_user_id, status);
CREATE INDEX commission_ledger_order_idx ON public.commission_ledger (order_id);
CREATE UNIQUE INDEX commission_ledger_order_unique ON public.commission_ledger (order_id, practitioner_user_id) WHERE order_id IS NOT NULL;
CREATE INDEX commission_statements_practitioner_idx ON public.commission_statements (practitioner_user_id, period_start);

GRANT SELECT ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;
GRANT SELECT ON public.commission_statements TO authenticated;
GRANT ALL ON public.commission_statements TO service_role;

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_ledger_admin_all" ON public.commission_ledger
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "commission_ledger_own_select" ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (practitioner_user_id = auth.uid());

CREATE POLICY "commission_statements_admin_all" ON public.commission_statements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "commission_statements_own_select" ON public.commission_statements
  FOR SELECT TO authenticated
  USING (practitioner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_commission_statements(_period_start date, _period_end date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  v_stmt_id uuid;
  n integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR g IN
    SELECT practitioner_user_id, currency, sum(commission_amount_cents)::int AS total
      FROM public.commission_ledger
     WHERE status = 'tahakkuk'
       AND statement_id IS NULL
       AND created_at >= _period_start::timestamptz
       AND created_at < (_period_end + 1)::timestamptz
     GROUP BY practitioner_user_id, currency
  LOOP
    INSERT INTO public.commission_statements
      (practitioner_user_id, period_start, period_end, currency, total_amount_cents, status)
    VALUES (g.practitioner_user_id, _period_start, _period_end, g.currency, g.total, 'fatura_bekleniyor')
    RETURNING id INTO v_stmt_id;

    UPDATE public.commission_ledger
       SET status = 'ekstreye_alindi', statement_id = v_stmt_id
     WHERE status = 'tahakkuk'
       AND statement_id IS NULL
       AND practitioner_user_id = g.practitioner_user_id
       AND currency = g.currency
       AND created_at >= _period_start::timestamptz
       AND created_at < (_period_end + 1)::timestamptz;

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_commission_statements(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_commission_statements(date, date) TO authenticated, service_role;