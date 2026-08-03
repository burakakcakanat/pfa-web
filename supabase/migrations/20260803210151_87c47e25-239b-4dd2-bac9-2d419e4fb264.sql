-- =========================================================
-- 1. INSTRUMENT VERSIONS + IMMUTABLE ITEM SNAPSHOTS
-- =========================================================
CREATE TABLE public.instrument_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument text NOT NULL CHECK (instrument IN ('pfa','sevenq')),
  version integer NOT NULL,
  label text,
  notes text,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instrument, version)
);
CREATE UNIQUE INDEX instrument_versions_one_current
  ON public.instrument_versions (instrument) WHERE is_current;

GRANT SELECT ON public.instrument_versions TO authenticated;
GRANT ALL ON public.instrument_versions TO service_role;
ALTER TABLE public.instrument_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instrument_versions_read" ON public.instrument_versions
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.instrument_item_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument_version_id uuid NOT NULL REFERENCES public.instrument_versions(id) ON DELETE CASCADE,
  instrument text NOT NULL,
  version integer NOT NULL,
  question_id uuid NOT NULL,
  item_code text,
  level integer NOT NULL,
  capacity text,
  text_tr text NOT NULL,
  text_en text,
  reverse_coded boolean NOT NULL DEFAULT false,
  awareness_item boolean NOT NULL DEFAULT false,
  is_mini boolean NOT NULL DEFAULT false,
  is_pilot_only boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instrument_version_id, question_id)
);
CREATE INDEX instrument_item_snapshots_lookup
  ON public.instrument_item_snapshots (instrument, version, question_id);

GRANT SELECT ON public.instrument_item_snapshots TO authenticated;
GRANT ALL ON public.instrument_item_snapshots TO service_role;
ALTER TABLE public.instrument_item_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instrument_item_snapshots_read" ON public.instrument_item_snapshots
  FOR SELECT TO authenticated USING (true);

-- snapshot rows are append-only history: block mutation even for owners of the API roles
CREATE OR REPLACE FUNCTION public.block_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'instrument_item_snapshots satirlari degistirilemez (surum gecmisi)';
END;
$$;
CREATE TRIGGER instrument_item_snapshots_immutable
  BEFORE UPDATE ON public.instrument_item_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.block_snapshot_mutation();

-- =========================================================
-- 2. VERSION STAMP + RESEARCH ID + CONSENT ON SESSIONS
-- =========================================================
ALTER TABLE public.assessment_sessions
  ADD COLUMN instrument_version integer NOT NULL DEFAULT 1,
  ADD COLUMN research_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN research_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN research_consent_at timestamptz,
  ADD COLUMN research_consent_version text,
  ADD COLUMN research_consent_withdrawn_at timestamptz;
CREATE UNIQUE INDEX assessment_sessions_research_id_key ON public.assessment_sessions (research_id);

ALTER TABLE public.sevenq_sessions
  ADD COLUMN instrument_version integer NOT NULL DEFAULT 1,
  ADD COLUMN research_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN research_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN research_consent_at timestamptz,
  ADD COLUMN research_consent_version text,
  ADD COLUMN research_consent_withdrawn_at timestamptz;
CREATE UNIQUE INDEX sevenq_sessions_research_id_key ON public.sevenq_sessions (research_id);

-- =========================================================
-- 3. FREEZE REVERSE CODING WITH THE RESPONSE
-- =========================================================
ALTER TABLE public.assessment_answers
  ADD COLUMN reverse_coded boolean NOT NULL DEFAULT false;

-- =========================================================
-- 4. SNAPSHOT / BUMP MACHINERY
-- =========================================================
CREATE OR REPLACE FUNCTION public.refresh_instrument_snapshot(_instrument text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_num integer;
BEGIN
  SELECT id, version INTO v_id, v_num
    FROM public.instrument_versions WHERE instrument = _instrument AND is_current;
  IF v_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.instrument_item_snapshots WHERE instrument_version_id = v_id;

  IF _instrument = 'pfa' THEN
    INSERT INTO public.instrument_item_snapshots
      (instrument_version_id, instrument, version, question_id, item_code, level, capacity,
       text_tr, text_en, reverse_coded, awareness_item, is_mini, is_pilot_only, sort_order, active)
    SELECT v_id, 'pfa', v_num, q.id, NULL, q.level, NULL,
           q.text_tr, q.text_en, q.reverse_coded, false, q.is_mini, false, q.sort_order, q.active
      FROM public.assessment_questions q;
  ELSE
    INSERT INTO public.instrument_item_snapshots
      (instrument_version_id, instrument, version, question_id, item_code, level, capacity,
       text_tr, text_en, reverse_coded, awareness_item, is_mini, is_pilot_only, sort_order, active)
    SELECT v_id, 'sevenq', v_num, q.id, q.item_code, q.level, q.capacity,
           q.text_tr, q.text_en, false, q.awareness_item, false, q.is_pilot_only, q.sort_order, q.active
      FROM public.sevenq_questions q;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_instrument_snapshot(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.instrument_version_locked(_instrument text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num integer; n integer;
BEGIN
  SELECT version INTO v_num FROM public.instrument_versions WHERE instrument = _instrument AND is_current;
  IF v_num IS NULL THEN RETURN false; END IF;
  IF _instrument = 'pfa' THEN
    SELECT count(*) INTO n FROM public.assessment_sessions WHERE instrument_version = v_num;
  ELSE
    SELECT count(*) INTO n FROM public.sevenq_sessions WHERE instrument_version = v_num;
  END IF;
  RETURN n > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.instrument_version_locked(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_item_pool()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _instrument text;
BEGIN
  _instrument := CASE TG_TABLE_NAME WHEN 'assessment_questions' THEN 'pfa' ELSE 'sevenq' END;

  IF TG_OP = 'UPDATE' THEN
    -- allow no-op / non-substantive updates
    IF NEW.text_tr IS NOT DISTINCT FROM OLD.text_tr
       AND NEW.text_en IS NOT DISTINCT FROM OLD.text_en
       AND NEW.level IS NOT DISTINCT FROM OLD.level
       AND NEW.active IS NOT DISTINCT FROM OLD.active
       AND to_jsonb(NEW) - 'updated_at' - 'sort_order' IS NOT DISTINCT FROM (to_jsonb(OLD) - 'updated_at' - 'sort_order')
    THEN
      RETURN NEW;
    END IF;
  END IF;

  IF public.instrument_version_locked(_instrument) THEN
    RAISE EXCEPTION 'VERSION_LOCKED: bu surumde yanit toplanmis. Madde havuzunu duzenlemek icin once yeni bir olcek surumu olusturun.';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.after_item_pool_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_instrument_snapshot(
    CASE TG_TABLE_NAME WHEN 'assessment_questions' THEN 'pfa' ELSE 'sevenq' END);
  RETURN NULL;
END;
$$;

CREATE TRIGGER guard_assessment_questions
  BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.guard_item_pool();
CREATE TRIGGER snapshot_assessment_questions
  AFTER INSERT OR UPDATE OR DELETE ON public.assessment_questions
  FOR EACH STATEMENT EXECUTE FUNCTION public.after_item_pool_change();

CREATE TRIGGER guard_sevenq_questions
  BEFORE INSERT OR UPDATE OR DELETE ON public.sevenq_questions
  FOR EACH ROW EXECUTE FUNCTION public.guard_item_pool();
CREATE TRIGGER snapshot_sevenq_questions
  AFTER INSERT OR UPDATE OR DELETE ON public.sevenq_questions
  FOR EACH STATEMENT EXECUTE FUNCTION public.after_item_pool_change();

CREATE OR REPLACE FUNCTION public.bump_instrument_version(_instrument text, _label text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _instrument NOT IN ('pfa','sevenq') THEN RAISE EXCEPTION 'Bilinmeyen olcek'; END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO v_num
    FROM public.instrument_versions WHERE instrument = _instrument;

  UPDATE public.instrument_versions SET is_current = false
    WHERE instrument = _instrument AND is_current;

  INSERT INTO public.instrument_versions (instrument, version, label, notes, is_current, created_by)
  VALUES (_instrument, v_num, _label, _notes, true, auth.uid());

  PERFORM public.refresh_instrument_snapshot(_instrument);
  RETURN v_num;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_instrument_version(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_instrument_version(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_instrument_version(_instrument text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT version FROM public.instrument_versions
                    WHERE instrument = _instrument AND is_current), 1);
$$;
GRANT EXECUTE ON FUNCTION public.current_instrument_version(text) TO authenticated;

-- seed version 1 for both instruments and freeze the current pools
INSERT INTO public.instrument_versions (instrument, version, label, notes, is_current)
VALUES ('pfa', 1, 'v1 — pilot oncesi', 'Ilk dondurulan madde havuzu', true),
       ('sevenq', 1, 'v1 — pilot', 'Ilk dondurulan madde havuzu', true);
SELECT public.refresh_instrument_snapshot('pfa');
SELECT public.refresh_instrument_snapshot('sevenq');

-- backfill reverse_coded on the single existing answer set
UPDATE public.assessment_answers a
   SET reverse_coded = q.reverse_coded
  FROM public.assessment_questions q
 WHERE q.id = a.question_id;

-- =========================================================
-- 5. RESEARCH CONSENT TEXT (VERSIONED)
-- =========================================================
CREATE TABLE public.research_consent_versions (
  version text NOT NULL PRIMARY KEY,
  locale text NOT NULL DEFAULT 'tr',
  title text NOT NULL,
  body_md text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_consent_versions TO anon, authenticated;
GRANT ALL ON public.research_consent_versions TO service_role;
ALTER TABLE public.research_consent_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_versions_public_read" ON public.research_consent_versions
  FOR SELECT USING (active);

INSERT INTO public.research_consent_versions (version, title, body_md) VALUES (
'v1',
'Arastirma kullanimi icin acik riza',
'**Ne topluyoruz?** Olcek maddelerine verdiginiz tek tek yanitlar, olcegin surum numarasi ve — paylasmayi secerseniz — yas araligi, cinsiyet, egitim duzeyi ve meslek alani gibi kaba demografik bilgiler.

**Ne icin kullaniyoruz?** Yanitlariniz, olcegin gecerlik ve guvenilirlik calismalarinda (madde analizi, faktor analizi, ic tutarlilik) **kimliginizden arindirilmis** bicimde kullanilir. Arastirma yuzeyinde adiniz, e-postaniz veya kullanici kimliginiz yer almaz; kayitlariniz rastgele bir arastirma numarasiyla temsil edilir.

**Zorunlu mu?** Hayir. Bu onay tamamen isteginize baglidir ve kullanim kosullarini kabul etmenizden ayridir. Onay vermemeniz, kendi raporunuzu, sonuclarinizi veya hizmete erisiminizi **hicbir sekilde etkilemez**.

**Geri alabilir miyim?** Evet. Hesabim sayfasindan diledigniz zaman geri cekebilirsiniz. Geri cektiginizde kayitlariniz arastirma veri kumesinden derhal cikarilir ve sonraki hicbir analize dahil edilmez. Kendi raporlariniz sizde kalmaya devam eder.'
);

-- =========================================================
-- 6. OPTIONAL DEMOGRAPHICS (ONCE PER RESPONDENT)
-- =========================================================
CREATE TABLE public.respondent_demographics (
  user_id uuid NOT NULL PRIMARY KEY,
  age_band text CHECK (age_band IN ('18-24','25-34','35-44','45-54','55-64','65+','belirtmek-istemiyorum')),
  gender text CHECK (gender IN ('kadin','erkek','diger','belirtmek-istemiyorum')),
  education text CHECK (education IN ('lise-alti','lise','on-lisans','lisans','yuksek-lisans','doktora','belirtmek-istemiyorum')),
  occupation_field text CHECK (occupation_field IN ('saglik','egitim','muhendislik-teknoloji','isletme-finans','hukuk','sanat-medya','kamu','ogrenci','emekli','diger','belirtmek-istemiyorum')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.respondent_demographics TO authenticated;
GRANT ALL ON public.respondent_demographics TO service_role;
ALTER TABLE public.respondent_demographics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demographics_own" ON public.respondent_demographics
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER respondent_demographics_updated
  BEFORE UPDATE ON public.respondent_demographics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 7. CONSENT WITHDRAWAL
-- =========================================================
CREATE OR REPLACE FUNCTION public.withdraw_research_consent()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); n1 integer := 0; n2 integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE public.assessment_sessions
     SET research_consent = false, research_consent_withdrawn_at = now()
   WHERE user_id = v_uid AND research_consent;
  GET DIAGNOSTICS n1 = ROW_COUNT;

  UPDATE public.sevenq_sessions
     SET research_consent = false, research_consent_withdrawn_at = now()
   WHERE user_id = v_uid AND research_consent;
  GET DIAGNOSTICS n2 = ROW_COUNT;

  RETURN n1 + n2;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.withdraw_research_consent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_research_consent() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_research_consent()
RETURNS TABLE (consented boolean, consented_at timestamptz, consent_version text, session_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (
    SELECT research_consent, research_consent_at, research_consent_version
      FROM public.assessment_sessions WHERE user_id = auth.uid()
    UNION ALL
    SELECT research_consent, research_consent_at, research_consent_version
      FROM public.sevenq_sessions WHERE user_id = auth.uid()
  )
  SELECT COALESCE(bool_or(research_consent), false),
         max(research_consent_at),
         (SELECT research_consent_version FROM s WHERE research_consent ORDER BY research_consent_at DESC NULLS LAST LIMIT 1),
         COALESCE(count(*) FILTER (WHERE research_consent), 0)::int
    FROM s;
$$;
REVOKE EXECUTE ON FUNCTION public.my_research_consent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_research_consent() TO authenticated;

-- =========================================================
-- 8. DE-IDENTIFIED RESEARCH SURFACE (VIEWS, NO DATA COPY)
-- =========================================================
CREATE VIEW public.research_pfa_responses AS
SELECT
  s.research_id,
  s.instrument_version,
  s.type::text        AS session_type,
  s.started_at,
  s.completed_at,
  s.research_consent_version,
  a.question_id,
  snap.item_code,
  snap.level,
  snap.text_tr        AS item_text_tr,
  a.reverse_coded,
  a.value,
  d.age_band, d.gender, d.education, d.occupation_field
FROM public.assessment_sessions s
JOIN public.assessment_answers a ON a.session_id = s.id
LEFT JOIN public.instrument_item_snapshots snap
       ON snap.instrument = 'pfa' AND snap.version = s.instrument_version AND snap.question_id = a.question_id
LEFT JOIN public.respondent_demographics d ON d.user_id = s.user_id
WHERE s.research_consent = true;

CREATE VIEW public.research_sevenq_responses AS
SELECT
  s.research_id,
  s.instrument_version,
  s.status,
  s.started_at,
  s.completed_at,
  s.research_consent_version,
  a.question_id,
  snap.item_code,
  snap.level,
  snap.capacity,
  snap.awareness_item,
  snap.is_pilot_only,
  snap.text_tr        AS item_text_tr,
  a.value,
  d.age_band, d.gender, d.education, d.occupation_field
FROM public.sevenq_sessions s
JOIN public.sevenq_answers a ON a.session_id = s.id
LEFT JOIN public.instrument_item_snapshots snap
       ON snap.instrument = 'sevenq' AND snap.version = s.instrument_version AND snap.question_id = a.question_id
LEFT JOIN public.respondent_demographics d ON d.user_id = s.user_id
WHERE s.research_consent = true;

REVOKE ALL ON public.research_pfa_responses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.research_sevenq_responses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.research_pfa_responses TO service_role;
GRANT SELECT ON public.research_sevenq_responses TO service_role;