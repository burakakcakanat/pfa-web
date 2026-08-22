-- 1) Per-currency rounding steps
UPDATE public.system_rates SET key = 'kur.yuvarlama_basamagi_try', label_tr = 'TRY yuvarlama basamağı (kuruş)', aciklama = 'USD çapadan TRY türetirken uygulanan yuvarlama basamağı — 1000 kuruş = 10 TL' WHERE key = 'kur.yuvarlama_basamagi';

INSERT INTO public.system_rates (key, kategori, label_tr, label_en, value_type, value_numeric, currency, aciklama, min_value, max_value)
VALUES
 ('kur.yuvarlama_basamagi_eur','kur','EUR yuvarlama basamağı (sent)','EUR rounding step (cents)','integer',100,NULL,'USD çapadan EUR türetirken uygulanan yuvarlama basamağı — 100 sent = 1 €',1,100000),
 ('kur.yuvarlama_basamagi_usd','kur','USD yuvarlama basamağı (cent)','USD rounding step (cents)','integer',100,NULL,'USD fiyatlarında uygulanan yuvarlama basamağı — 100 cent = 1 $',1,100000)
ON CONFLICT (key) DO NOTHING;

-- 2) Product name clarification
UPDATE public.products SET name_tr = 'PFA Uygulayıcı Lisansı', updated_at = now() WHERE slug = 'pfa-pro-lisans-paketi';

-- 8) locale / country future-proofing columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS locale text, ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.assessment_sessions ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.sevenq_sessions ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.purchase_inquiries ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.license_inquiries ADD COLUMN IF NOT EXISTS locale text, ADD COLUMN IF NOT EXISTS country text;

-- 9) Print editions — inventory only, inactive
INSERT INTO public.products (slug, name_tr, name_en, type, price_cents, currency, active, language, book_key, category, description_tr, description_en)
VALUES
 ('pfa-print-tr','PFA (TR) — Basılı','PFA (TR) — Print','ebook',0,'usd',false,'tr','pfa','kitap','Basılı sürüm — envanter kaydı, satışa açık değil.','Print edition — inventory record, not for sale.'),
 ('pfa-print-en','PFA (EN) — Paperback','PFA (EN) — Paperback','ebook',0,'usd',false,'en','pfa','kitap','Basılı sürüm — envanter kaydı, satışa açık değil.','Print edition — inventory record, not for sale.'),
 ('hcd-print-en','HCD (EN) — Paperback','HCD (EN) — Paperback','ebook',0,'usd',false,'en','hcd','kitap','Basılı sürüm — envanter kaydı, satışa açık değil.','Print edition — inventory record, not for sale.')
ON CONFLICT (slug) DO NOTHING;