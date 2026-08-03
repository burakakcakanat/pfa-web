ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirm_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Existing subscribers opted in before double opt-in existed: treat as confirmed.
UPDATE public.newsletter_subscribers
  SET confirmed = true, confirmed_at = COALESCE(confirmed_at, created_at)
  WHERE confirmed IS DISTINCT FROM true;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_idx
  ON public.newsletter_subscribers (confirm_token);

CREATE TABLE IF NOT EXISTS public.webinar_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_session_id uuid NOT NULL REFERENCES public.webinar_sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  reminder_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webinar_session_id, email)
);

GRANT ALL ON public.webinar_reminders TO service_role;
ALTER TABLE public.webinar_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view webinar reminders"
  ON public.webinar_reminders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_webinar_reminders_updated_at
  BEFORE UPDATE ON public.webinar_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('pfa-webinar-daily-reminders')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pfa-webinar-daily-reminders');

-- 08:00 Europe/Istanbul = 05:00 UTC
SELECT cron.schedule(
  'pfa-webinar-daily-reminders',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--44be45c7-823e-4ba9-a499-7a3721c2318a.lovable.app/api/public/webinar-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);