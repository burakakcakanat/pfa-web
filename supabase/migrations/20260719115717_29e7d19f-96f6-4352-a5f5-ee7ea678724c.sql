
-- ============ TABLES ============

CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INT NOT NULL CHECK (level BETWEEN 1 AND 7),
  text_tr TEXT NOT NULL,
  text_en TEXT,
  reverse_coded BOOLEAN NOT NULL DEFAULT false,
  is_mini BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessment_questions TO anon, authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active questions" ON public.assessment_questions
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins can manage questions" ON public.assessment_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TYPE public.assessment_type AS ENUM ('mini', 'full');
CREATE TYPE public.assessment_status AS ENUM ('in_progress', 'completed');

CREATE TABLE public.assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_invite_id UUID,
  guest_token TEXT,
  type public.assessment_type NOT NULL,
  status public.assessment_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.assessment_sessions (user_id);
CREATE INDEX ON public.assessment_sessions (guest_token);
GRANT SELECT, INSERT, UPDATE ON public.assessment_sessions TO authenticated;
GRANT ALL ON public.assessment_sessions TO service_role;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.assessment_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.assessment_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.assessment_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.assessment_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  value INT NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX ON public.assessment_answers (session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_answers TO authenticated;
GRANT ALL ON public.assessment_answers TO service_role;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own answers" ON public.assessment_answers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  level_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  intelligence_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_band JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assessment_results TO authenticated;
GRANT ALL ON public.assessment_results TO service_role;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own results" ON public.assessment_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own results" ON public.assessment_results
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins view all results" ON public.assessment_results
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TYPE public.invite_status AS ENUM ('pending', 'completed');

CREATE TABLE public.pro_client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_client_invites TO authenticated;
GRANT ALL ON public.pro_client_invites TO service_role;
ALTER TABLE public.pro_client_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pros manage own invites" ON public.pro_client_invites
  FOR ALL TO authenticated
  USING (auth.uid() = pro_user_id) WITH CHECK (auth.uid() = pro_user_id);

-- updated_at triggers
CREATE TRIGGER trg_q_updated BEFORE UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_s_updated BEFORE UPDATE ON public.assessment_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_i_updated BEFORE UPDATE ON public.pro_client_invites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED 35 DRAFT MINI QUESTIONS ============
INSERT INTO public.assessment_questions (level, text_tr, reverse_coded, is_mini, sort_order) VALUES
-- L1 Survival / Physical
(1, 'Uyku, beslenme ve dinlenme düzenimi koruyabiliyorum.', false, true, 1),
(1, 'Bedenimden gelen sinyalleri (yorgunluk, açlık, gerginlik) zamanında fark ederim.', false, true, 2),
(1, 'Beklenmedik değişiklikler karşısında kendimi güvende hissetmekte zorlanırım.', true, true, 3),
(1, 'Günlük yaşamımı sürdürecek maddi ve pratik kaynaklara erişimim var.', false, true, 4),
(1, 'Fiziksel sağlığıma özen gösteren rutinlerim var.', false, true, 5),
-- L2 Emotional
(2, 'Yaşadığım duyguları isimlendirebilirim.', false, true, 6),
(2, 'Güçlü duygular karşısında kendimi düzenleyebilirim.', false, true, 7),
(2, 'Zor duygularımı bastırma eğilimindeyim.', true, true, 8),
(2, 'Başkalarının duygularını fark eder ve dikkate alırım.', false, true, 9),
(2, 'Duygusal iniş çıkışlarım günlük işlevimi bozar.', true, true, 10),
-- L3 Analytical / Mental
(3, 'Karar verirken varsayımlarımı sorgularım.', false, true, 11),
(3, 'Karmaşık bir durumu parçalara ayırıp analiz edebilirim.', false, true, 12),
(3, 'Farklı bakış açılarını değerlendirmeye açığım.', false, true, 13),
(3, 'İlk aklıma gelen çözüme çabucak bağlanırım.', true, true, 14),
(3, 'Yeni bilgi karşısında görüşümü güncelleyebilirim.', false, true, 15),
-- L4 Love / Meaning
(4, 'Yaşadıklarımda anlam bulmaya çalışırım.', false, true, 16),
(4, 'Kendimi olduğum haliyle kabul edebiliyorum.', false, true, 17),
(4, 'Sevdiklerimle derin bir bağ kurabiliyorum.', false, true, 18),
(4, 'Kendime karşı sık sık sert ve yargılayıcı olurum.', true, true, 19),
(4, 'Hayatımda beni yönlendiren bir amaç duygusu var.', false, true, 20),
-- L5 Creativity / Flow
(5, 'Bir işe daldığımda zamanın nasıl geçtiğini fark etmem.', false, true, 21),
(5, 'Sıradan sorunlara yaratıcı çözümler üretmekten keyif alırım.', false, true, 22),
(5, 'Yeni fikirleri denemekten çekinirim.', true, true, 23),
(5, 'İlhamımı besleyen düzenli pratiklerim var.', false, true, 24),
(5, 'Kendimi ifade etmek için doğal alanlar buluyorum.', false, true, 25),
-- L6 Wisdom / Guidance
(6, 'Zor bir kararda içsel rehberliğe kulak veririm.', false, true, 26),
(6, 'Kontrolüm dışında olanı bırakabilirim.', false, true, 27),
(6, 'Her şeyi kendi çabamla halletmem gerektiğini hissederim.', true, true, 28),
(6, 'Deneyimlerimden ders çıkarıp bilgeliğe dönüştürebilirim.', false, true, 29),
(6, 'Belirsizlikle sükûnet içinde kalabilirim.', false, true, 30),
-- L7 Unity / Transcendence
(7, 'Kendimi tüm canlılarla derin bir bağ içinde hissettiğim anlar olur.', false, true, 31),
(7, 'Küçük anların içinde bir bütünlük hissi yaşarım.', false, true, 32),
(7, 'Ben duygusunun ötesinde bir farkındalığı deneyimlemek bana yabancıdır.', true, true, 33),
(7, 'Doğa ya da sanat karşısında zaman zaman kendimden geçerim.', false, true, 34),
(7, 'Yaşamı, ayrı parçalardan çok bütünsel bir akış olarak deneyimlerim.', false, true, 35);
