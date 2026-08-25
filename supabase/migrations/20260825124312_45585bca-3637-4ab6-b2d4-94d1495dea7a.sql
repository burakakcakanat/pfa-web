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
     COALESCE(a.tier = 'fellow', false) AS is_fellow
    FROM public.practitioners p
    LEFT JOIN public.practitioner_accounts a ON a.user_id = p.user_id
   WHERE p.published = true;

GRANT SELECT ON public.practitioners_public TO anon, authenticated;