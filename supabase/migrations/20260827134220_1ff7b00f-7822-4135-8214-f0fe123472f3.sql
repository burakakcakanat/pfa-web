-- 1) Dedication templates per book
ALTER TABLE public.ebook_dedication_templates
  ADD COLUMN IF NOT EXISTS book_key text NOT NULL DEFAULT 'pfa';

ALTER TABLE public.ebook_dedication_templates
  ADD CONSTRAINT ebook_dedication_templates_book_key_chk CHECK (book_key IN ('pfa','hcd'));

UPDATE public.ebook_dedication_templates SET book_key = 'pfa' WHERE book_key IS NULL OR book_key = '';

ALTER TABLE public.ebook_dedication_templates
  DROP CONSTRAINT IF EXISTS ebook_dedication_templates_locale_key;
CREATE UNIQUE INDEX IF NOT EXISTS ebook_dedication_templates_book_locale_key
  ON public.ebook_dedication_templates (book_key, locale);

-- 2) Public practitioner directory: expose badge tier
CREATE OR REPLACE VIEW public.practitioners_public
WITH (security_invoker = true) AS
  SELECT p.id,
     p.full_name,
     p.category,
     p.title,
     p.photo_url,
     p.short_bio,
     p.long_bio,
     p.specializations,
     p.languages,
     p.city,
     p.country,
     p.mode,
     p.website,
     p.sort_order,
     p.created_at,
     COALESCE(a.tier = 'fellow'::text, false) AS is_fellow,
     CASE
       WHEN a.tier = 'resident_fellow' THEN 'resident_fellow'
       WHEN a.tier = 'fellow' THEN 'fellow'
       WHEN a.tier IS NOT NULL THEN 'practitioner'
       ELSE 'practitioner'
     END AS badge_tier
    FROM public.practitioners p
      LEFT JOIN public.practitioner_accounts a ON a.user_id = p.user_id
   WHERE p.published = true;

GRANT SELECT ON public.practitioners_public TO anon, authenticated;
GRANT ALL ON public.practitioners_public TO service_role;