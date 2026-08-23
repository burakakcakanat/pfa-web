-- 1) Herkese açık tam satır erişimini kaldır
DROP POLICY IF EXISTS "Public can read webinar sessions" ON public.webinar_sessions;

-- 2) Erişim kontrol fonksiyonu (yalnızca okur)
CREATE OR REPLACE FUNCTION public.has_webinar_access(_webinar_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.webinar_sessions w
    WHERE w.id = _webinar_session_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.user_id = auth.uid()
            AND o.product_id = w.product_id
            AND o.status = 'paid'
        )
        OR EXISTS (
          SELECT 1
          FROM public.user_entitlements e
          JOIN public.products p ON p.id = w.product_id
          WHERE e.user_id = auth.uid()
            AND (
              e.type = 'webinar_bsc'::public.entitlement_type AND p.slug = 'bilinc-seviyeleri-calismalari'
              OR e.type = 'pfa_pro'::public.entitlement_type AND p.slug = 'pfa-pro-lisans-paketi'
              OR e.metadata->>'product_slug' = p.slug
            )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_webinar_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_webinar_access(uuid) TO authenticated, service_role;

-- 3) Tam satır erişimi: admin her zaman, aksi halde satın alan kullanıcı
CREATE POLICY "Entitled users read webinar sessions"
ON public.webinar_sessions
FOR SELECT
TO authenticated
USING (public.has_webinar_access(id));

-- 4) Pazarlama görünümü: hassas alanlar yok
CREATE OR REPLACE VIEW public.webinar_sessions_public
WITH (security_invoker = true) AS
  SELECT id, product_id, title, starts_at, capacity, banner_url, created_at
  FROM public.webinar_sessions;

REVOKE ALL ON public.webinar_sessions_public FROM anon;
GRANT SELECT ON public.webinar_sessions_public TO authenticated, service_role;

-- Anon rolü temel tabloda hassas kolonlara asla erişemez
REVOKE ALL ON public.webinar_sessions FROM anon;
REVOKE SELECT (join_url, notes) ON public.webinar_sessions FROM authenticated;
GRANT SELECT (id, product_id, title, starts_at, capacity, banner_url, created_at) ON public.webinar_sessions TO authenticated;