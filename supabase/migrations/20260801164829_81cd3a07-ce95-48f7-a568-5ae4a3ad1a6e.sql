ALTER TABLE public.products
  ADD COLUMN category text NOT NULL DEFAULT 'diger';

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (category IN ('kitap','olcme','seans','paket','program','diger'));

UPDATE public.products SET category = 'kitap' WHERE slug = 'pfa-ebook-tr';
UPDATE public.products SET category = 'kitap' WHERE slug = 'pfa-ebook-en';
UPDATE public.products SET category = 'kitap' WHERE slug = 'hcd-ebook-en';
UPDATE public.products SET category = 'olcme' WHERE slug = 'tam-assessment-rapor';
UPDATE public.products SET category = 'olcme' WHERE slug = 'client-pack-10';
UPDATE public.products SET category = 'seans' WHERE slug = 'danismanlik-oturumu';
UPDATE public.products SET category = 'seans' WHERE slug = 'bilinc-seviyeleri-calismalari';
UPDATE public.products SET category = 'program' WHERE slug = 'pfa-pro-lisans-paketi';