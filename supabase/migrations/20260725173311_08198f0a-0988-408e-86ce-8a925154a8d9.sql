-- 1) products: yeni alanlar
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS master_pdf_path text,
  ADD COLUMN IF NOT EXISTS master_epub_path text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS book_key text,
  ADD COLUMN IF NOT EXISTS activate_at timestamptz;

UPDATE public.products SET book_key='pfa', language='tr' WHERE slug='pfa-ebook-tr';
UPDATE public.products SET book_key='pfa', language='en' WHERE slug='pfa-ebook-en';
UPDATE public.products SET book_key='hcd', language='en', active=false, activate_at='2026-10-23 00:00:00+03' WHERE slug='hcd-ebook-en';

-- 2) book_editions
CREATE TABLE IF NOT EXISTS public.book_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_key text NOT NULL,
  format text NOT NULL CHECK (format IN ('kindle','paperback','google_play')),
  asin text,
  external_url text,
  marketplaces text[] NOT NULL DEFAULT '{}',
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.book_editions TO anon, authenticated;
GRANT ALL ON public.book_editions TO authenticated;
GRANT ALL ON public.book_editions TO service_role;
ALTER TABLE public.book_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_editions read active" ON public.book_editions FOR SELECT USING (active = true);
CREATE POLICY "book_editions admin read" ON public.book_editions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "book_editions admin write" ON public.book_editions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER book_editions_updated BEFORE UPDATE ON public.book_editions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.book_editions (book_key,format,asin,marketplaces,active,sort_order) VALUES
  ('pfa','kindle','B0H3BSWK1D', ARRAY['us','uk','de','fr','es','it','nl','jp','br','ca','mx','au','in'], true, 1),
  ('pfa','paperback','B0HBL757ZD', ARRAY['us','uk','de','fr','es','it','nl','pl','se','be','ie','jp','ca','au'], false, 2),
  ('pfa','google_play',NULL, ARRAY[]::text[], false, 3),
  ('hcd','kindle','B00YJP1ODE', ARRAY['us','uk','de','fr','es','it','nl','jp','br','ca','mx','au','in'], true, 1),
  ('hcd','paperback','B0HB64WHDC', ARRAY['us','uk','de','fr','es','it','nl','pl','se','be','ie','jp','ca','au'], true, 2);

-- 3) bundles + bundle_items
CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_tr text NOT NULL,
  name_en text,
  description_tr text,
  description_en text,
  book_key text NOT NULL,
  includes_book boolean NOT NULL DEFAULT true,
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('locked_to_product','sum_minus_percent')),
  locked_to_product_slug text,
  discount_percent int NOT NULL DEFAULT 10,
  price_override_cents int,
  active boolean NOT NULL DEFAULT false,
  activate_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bundles TO anon, authenticated;
GRANT ALL ON public.bundles TO authenticated;
GRANT ALL ON public.bundles TO service_role;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundles read active" ON public.bundles FOR SELECT USING (active = true AND (activate_at IS NULL OR activate_at <= now()));
CREATE POLICY "bundles admin read" ON public.bundles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "bundles admin write" ON public.bundles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER bundles_updated BEFORE UPDATE ON public.bundles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  quantity int NOT NULL DEFAULT 1
);
GRANT SELECT ON public.bundle_items TO anon, authenticated;
GRANT ALL ON public.bundle_items TO authenticated;
GRANT ALL ON public.bundle_items TO service_role;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundle_items read" ON public.bundle_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND (b.active = true AND (b.activate_at IS NULL OR b.activate_at <= now()) OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "bundle_items admin write" ON public.bundle_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed bundles
WITH ins AS (
  INSERT INTO public.bundles (slug,name_tr,name_en,description_tr,book_key,includes_book,pricing_mode,locked_to_product_slug,discount_percent,active,activate_at,sort_order) VALUES
    ('pfa-seans-kitap','Birebir Seans + İmzalı Kitap','One-on-One Session + Signed Book','Seansa katılan danışanlara imzalı nüsha eşlik eder.','pfa',true,'locked_to_product','danismanlik-oturumu',0,true,NULL,1),
    ('pfa-olcek-kitap','Tam PA Ölçeği + İmzalı Kitap','Full PA Assessment + Signed Book','Tam ölçek raporu ile birlikte imzalı kitap.','pfa',true,'sum_minus_percent',NULL,10,true,NULL,2),
    ('pfa-olcek-seans-kitap','Tam PA Ölçeği + Birebir Seans + İmzalı Kitap','Full PA Assessment + Session + Signed Book','Rapor, seans ve imzalı kitap bir arada.','pfa',true,'sum_minus_percent',NULL,10,true,NULL,3),
    ('hcd-seans-kitap','Birebir Seans + İmzalı HCD','One-on-One Session + Signed HCD','Seansa katılan danışanlara imzalı nüsha eşlik eder.','hcd',true,'locked_to_product','danismanlik-oturumu',0,false,'2026-10-23 00:00:00+03',4),
    ('hcd-olcek-kitap','Tam PA Ölçeği + İmzalı HCD','Full PA Assessment + Signed HCD','Tam ölçek raporu ile birlikte imzalı HCD.','hcd',true,'sum_minus_percent',NULL,10,false,'2026-10-23 00:00:00+03',5),
    ('hcd-olcek-seans-kitap','Tam PA Ölçeği + Birebir Seans + İmzalı HCD','Full PA Assessment + Session + Signed HCD','Rapor, seans ve imzalı HCD bir arada.','hcd',true,'sum_minus_percent',NULL,10,false,'2026-10-23 00:00:00+03',6)
  RETURNING id, slug
)
INSERT INTO public.bundle_items (bundle_id, product_slug)
SELECT ins.id, x.slug FROM ins JOIN (VALUES
  ('pfa-seans-kitap','danismanlik-oturumu'),
  ('pfa-olcek-kitap','tam-assessment-rapor'),
  ('pfa-olcek-seans-kitap','tam-assessment-rapor'),
  ('pfa-olcek-seans-kitap','danismanlik-oturumu'),
  ('hcd-seans-kitap','danismanlik-oturumu'),
  ('hcd-olcek-kitap','tam-assessment-rapor'),
  ('hcd-olcek-seans-kitap','tam-assessment-rapor'),
  ('hcd-olcek-seans-kitap','danismanlik-oturumu')
) AS x(bslug, slug) ON x.bslug = ins.slug;
