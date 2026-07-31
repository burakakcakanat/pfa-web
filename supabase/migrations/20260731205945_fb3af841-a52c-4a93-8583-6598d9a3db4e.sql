CREATE TABLE public.sevenq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level int NOT NULL CHECK (level BETWEEN 1 AND 7),
  item_code text NOT NULL UNIQUE,
  capacity text NOT NULL CHECK (capacity IN ('U','Y','D','I','R')),
  text_tr text NOT NULL,
  text_en text,
  awareness_item boolean NOT NULL DEFAULT false,
  is_pilot_only boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sevenq_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sevenq_questions TO authenticated;
GRANT ALL ON public.sevenq_questions TO service_role;
ALTER TABLE public.sevenq_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active 7q questions" ON public.sevenq_questions FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins can manage 7q questions" ON public.sevenq_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.sevenq_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  client_invite_id uuid REFERENCES public.pro_client_invites(id) ON DELETE SET NULL,
  guest_token text,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sevenq_sessions TO authenticated;
GRANT ALL ON public.sevenq_sessions TO service_role;
ALTER TABLE public.sevenq_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own 7q sessions" ON public.sevenq_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own 7q sessions" ON public.sevenq_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own 7q sessions" ON public.sevenq_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all 7q sessions" ON public.sevenq_sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Pros view invited client 7q sessions" ON public.sevenq_sessions FOR SELECT TO authenticated USING (
  client_invite_id IS NOT NULL
  AND (has_role(auth.uid(), 'pro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (SELECT 1 FROM public.pro_client_invites i WHERE i.id = sevenq_sessions.client_invite_id AND i.pro_user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.can_view_sevenq_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sevenq_sessions s
    WHERE s.id = _session_id
      AND (
        s.user_id = auth.uid()
        OR (
          s.client_invite_id IS NOT NULL
          AND (public.has_role(auth.uid(), 'pro'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
          AND EXISTS (SELECT 1 FROM public.pro_client_invites i WHERE i.id = s.client_invite_id AND i.pro_user_id = auth.uid())
        )
      )
  )
$$;

CREATE TABLE public.sevenq_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sevenq_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.sevenq_questions(id) ON DELETE CASCADE,
  value int NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sevenq_answers TO authenticated;
GRANT ALL ON public.sevenq_answers TO service_role;
ALTER TABLE public.sevenq_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own 7q answers" ON public.sevenq_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sevenq_sessions s WHERE s.id = sevenq_answers.session_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sevenq_sessions s WHERE s.id = sevenq_answers.session_id AND s.user_id = auth.uid()));

CREATE TABLE public.sevenq_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.sevenq_sessions(id) ON DELETE CASCADE,
  level_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  capacity_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score int NOT NULL DEFAULT 0,
  akort int NOT NULL DEFAULT 0,
  awareness_score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sevenq_results TO authenticated;
GRANT ALL ON public.sevenq_results TO service_role;
ALTER TABLE public.sevenq_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own 7q results" ON public.sevenq_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sevenq_sessions s WHERE s.id = sevenq_results.session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own 7q results" ON public.sevenq_results FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sevenq_sessions s WHERE s.id = sevenq_results.session_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins view all 7q results" ON public.sevenq_results FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Pros view invited client 7q results" ON public.sevenq_results FOR SELECT TO authenticated USING (public.can_view_sevenq_session(session_id));

CREATE TRIGGER update_sevenq_questions_updated_at BEFORE UPDATE ON public.sevenq_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_sevenq_sessions_updated_at BEFORE UPDATE ON public.sevenq_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES ('sevenq_pilot_open', 'true')
ON CONFLICT (key) DO NOTHING;