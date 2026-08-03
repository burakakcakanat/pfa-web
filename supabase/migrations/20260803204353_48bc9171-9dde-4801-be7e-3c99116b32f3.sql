UPDATE public.site_settings
SET value = encode(gen_random_bytes(48), 'hex')
WHERE key = 'cron_reminder_token';