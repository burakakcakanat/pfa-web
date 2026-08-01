REVOKE INSERT, UPDATE, DELETE ON public.practitioners FROM authenticated;
REVOKE ALL ON public.practitioners FROM anon;
GRANT SELECT ON public.practitioners TO anon;
GRANT SELECT ON public.practitioners TO authenticated;
GRANT ALL ON public.practitioners TO service_role;

REVOKE ALL ON public.practitioner_applications FROM anon;
REVOKE UPDATE, DELETE ON public.practitioner_applications FROM authenticated;
GRANT SELECT, INSERT ON public.practitioner_applications TO authenticated;
GRANT ALL ON public.practitioner_applications TO service_role;