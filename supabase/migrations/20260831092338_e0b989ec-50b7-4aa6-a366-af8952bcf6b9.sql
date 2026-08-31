DROP POLICY IF EXISTS "bundle_items read" ON public.bundle_items;

CREATE POLICY "bundle_items public read live" ON public.bundle_items
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.bundles b
  WHERE b.id = bundle_items.bundle_id
    AND b.active = true
    AND (b.activate_at IS NULL OR b.activate_at <= now())
));

CREATE POLICY "bundle_items admin read" ON public.bundle_items
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.bundle_items TO anon, authenticated;