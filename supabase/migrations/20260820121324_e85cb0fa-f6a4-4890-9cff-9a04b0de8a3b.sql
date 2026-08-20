-- ============ system_rates ============
CREATE TABLE public.system_rates (
  key text PRIMARY KEY,
  kategori text NOT NULL,
  label_tr text NOT NULL,
  label_en text,
  value_type text NOT NULL,
  value_numeric numeric NOT NULL DEFAULT 0,
  currency text,
  aciklama text,
  min_value numeric,
  max_value numeric,
  kaynak_karar text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_rates TO authenticated;
GRANT ALL ON public.system_rates TO service_role;
ALTER TABLE public.system_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_rates_admin_all" ON public.system_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ rate_change_log ============
CREATE TABLE public.rate_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  eski_deger numeric,
  yeni_deger numeric,
  degistiren uuid,
  degisim_at timestamptz NOT NULL DEFAULT now(),
  not_metni text
);
CREATE INDEX rate_change_log_key_idx ON public.rate_change_log (key, degisim_at DESC);
GRANT SELECT, INSERT ON public.rate_change_log TO authenticated;
GRANT ALL ON public.rate_change_log TO service_role;
ALTER TABLE public.rate_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_change_log_admin_read" ON public.rate_change_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rate_change_log_admin_insert" ON public.rate_change_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ corporate_package_tiers ============
CREATE TABLE public.corporate_package_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier integer NOT NULL UNIQUE,
  indirim_orani numeric NOT NULL DEFAULT 0,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporate_package_tiers TO authenticated;
GRANT ALL ON public.corporate_package_tiers TO service_role;
ALTER TABLE public.corporate_package_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corporate_tiers_admin_all" ON public.corporate_package_tiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER corporate_tiers_updated BEFORE UPDATE ON public.corporate_package_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ fx_rates ============
CREATE TABLE public.fx_rates (
  tarih date NOT NULL,
  para_birimi text NOT NULL,
  tcmb_alis numeric,
  tcmb_satis numeric,
  kaynak text NOT NULL DEFAULT 'tcmb',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tarih, para_birimi)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_rates TO authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx_rates_admin_all" ON public.fx_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ product_prices: geçiş penceresi ve türetme alanları ============
ALTER TABLE public.product_prices
  ADD COLUMN previous_price_cents integer,
  ADD COLUMN previous_valid_until timestamptz,
  ADD COLUMN auto_update_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN last_fx_rate numeric,
  ADD COLUMN price_set_at timestamptz NOT NULL DEFAULT now();

-- ============ denetim izi tetikleyicileri ============
CREATE OR REPLACE FUNCTION public.log_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
  v_old numeric;
  v_new numeric;
  v_actor uuid := auth.uid();
BEGIN
  IF TG_TABLE_NAME = 'system_rates' THEN
    v_key := COALESCE(NEW.key, OLD.key);
    v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.value_numeric END;
    v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.value_numeric END;
  ELSE
    v_key := 'urun_fiyat.' || COALESCE(NEW.product_id, OLD.product_id)::text || '.' || COALESCE(NEW.currency, OLD.currency);
    v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.price_cents END;
    v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.price_cents END;
  END IF;

  IF TG_OP = 'UPDATE' AND v_old IS NOT DISTINCT FROM v_new THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.rate_change_log (key, eski_deger, yeni_deger, degistiren, not_metni)
  VALUES (v_key, v_old, v_new, v_actor,
          CASE WHEN v_actor IS NULL THEN 'otomatik türetme' ELSE NULL END);

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER system_rates_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.system_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();

CREATE TRIGGER product_prices_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();