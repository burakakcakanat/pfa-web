
DROP POLICY IF EXISTS "Anyone can view webinar sessions" ON public.webinar_sessions;
CREATE POLICY "Anyone can view webinar sessions" ON public.webinar_sessions
  FOR SELECT USING (true);

GRANT SELECT ON public.webinar_sessions TO anon;
