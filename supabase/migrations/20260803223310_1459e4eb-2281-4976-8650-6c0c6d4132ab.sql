INSERT INTO public.site_settings (key, value)
VALUES ('payments_enabled', 'false')
ON CONFLICT (key) DO NOTHING;