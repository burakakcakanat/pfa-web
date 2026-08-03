-- 1) ebooks bucket: drop the blanket "any ebook buyer reads everything" rule.
-- All delivery is server-side via service-role signed URLs scoped to the
-- caller's own entitlement, so no client-side SELECT policy is needed.
DROP POLICY IF EXISTS "Entitled users read ebooks" ON storage.objects;

-- 2) Trigger / internal functions must not be directly callable.
REVOKE EXECUTE ON FUNCTION public.handle_bundle_paid() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_order_paid() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;

-- 3) site_settings: only genuinely public keys are readable.
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Public read of non-sensitive site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key LIKE 'social\_%'
  OR key IN (
    'podcast_program_url',
    'sevenq_pilot_open',
    'newsletter_bg_image_url',
    'newsletter_bg_side'
  )
);
