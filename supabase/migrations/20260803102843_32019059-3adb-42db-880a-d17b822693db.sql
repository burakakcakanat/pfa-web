INSERT INTO public.site_settings (key, value)
VALUES ('cron_reminder_token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

SELECT cron.unschedule('pfa-webinar-daily-reminders')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pfa-webinar-daily-reminders');

-- 08:00 Europe/Istanbul = 05:00 UTC
SELECT cron.schedule(
  'pfa-webinar-daily-reminders',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--44be45c7-823e-4ba9-a499-7a3721c2318a.lovable.app/api/public/webinar-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT value FROM public.site_settings WHERE key = 'cron_reminder_token')
    ),
    body := '{}'::jsonb
  );
  $$
);