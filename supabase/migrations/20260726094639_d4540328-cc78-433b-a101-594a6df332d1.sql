
ALTER VIEW public.practitioners_public SET (security_invoker = true);

-- Column-level SELECT for anon on base table (email intentionally excluded)
GRANT SELECT
  (id, full_name, category, title, photo_url, short_bio, long_bio,
   specializations, languages, city, country, mode, website,
   published, sort_order, created_at)
  ON public.practitioners TO anon;

-- Policy so anon can read published rows through the view / base table
CREATE POLICY "Public read published practitioners"
  ON public.practitioners FOR SELECT
  TO anon, authenticated
  USING (published = true);
