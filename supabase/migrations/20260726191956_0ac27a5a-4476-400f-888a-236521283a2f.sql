-- Enums
CREATE TYPE public.newsletter_segment AS ENUM ('merakli','profesyonel','kurumsal');
CREATE TYPE public.newsletter_target_segment AS ENUM ('merakli','profesyonel','kurumsal','tumu');
CREATE TYPE public.newsletter_issue_status AS ENUM ('taslak','gonderildi');

-- Subscribers
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  segment public.newsletter_segment NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  consent boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT false,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
CREATE INDEX ON public.newsletter_subscribers (segment);
CREATE INDEX ON public.newsletter_subscribers (unsubscribe_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages subscribers"
  ON public.newsletter_subscribers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER newsletter_subscribers_set_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Issues
CREATE TABLE public.newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  segment public.newsletter_target_segment NOT NULL DEFAULT 'tumu',
  content_md text NOT NULL DEFAULT '',
  status public.newsletter_issue_status NOT NULL DEFAULT 'taslak',
  scheduled_note text,
  sent_at timestamptz,
  sent_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_issues TO authenticated;
GRANT ALL ON public.newsletter_issues TO service_role;

ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages issues"
  ON public.newsletter_issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER newsletter_issues_set_updated_at
  BEFORE UPDATE ON public.newsletter_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();