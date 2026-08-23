REVOKE SELECT ON public.practitioners FROM anon;
GRANT SELECT (
  id, full_name, category, title, photo_url, short_bio, long_bio,
  specializations, languages, city, country, mode, website, published,
  sort_order, created_at, updated_at, user_id
) ON public.practitioners TO anon;
GRANT SELECT ON public.practitioners TO authenticated;