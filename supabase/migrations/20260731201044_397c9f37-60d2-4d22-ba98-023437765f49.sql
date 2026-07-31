CREATE OR REPLACE FUNCTION public.can_view_assessment_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessment_sessions s
    WHERE s.id = _session_id
      AND (
        s.user_id = auth.uid()
        OR (
          s.client_invite_id IS NOT NULL
          AND (public.has_role(auth.uid(), 'pro') OR public.has_role(auth.uid(), 'admin'))
          AND EXISTS (
            SELECT 1 FROM public.pro_client_invites i
            WHERE i.id = s.client_invite_id
              AND i.pro_user_id = auth.uid()
          )
        )
      )
  );
$$;

CREATE POLICY "Pros view invited client sessions"
ON public.assessment_sessions
FOR SELECT
TO authenticated
USING (
  client_invite_id IS NOT NULL
  AND (public.has_role(auth.uid(), 'pro') OR public.has_role(auth.uid(), 'admin'))
  AND EXISTS (
    SELECT 1 FROM public.pro_client_invites i
    WHERE i.id = assessment_sessions.client_invite_id
      AND i.pro_user_id = auth.uid()
  )
);

CREATE POLICY "Pros view invited client results"
ON public.assessment_results
FOR SELECT
TO authenticated
USING (public.can_view_assessment_session(session_id));