-- Kolon düzeyi kısıtlama gereksizdi ve admin kaydını bozuyordu: satır düzeyi
-- politika (has_webinar_access) zaten join_url/notes erişimini yönetiyor.
GRANT SELECT ON public.webinar_sessions TO authenticated;