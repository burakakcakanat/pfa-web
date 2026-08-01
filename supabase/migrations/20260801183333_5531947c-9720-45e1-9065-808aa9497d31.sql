CREATE TABLE IF NOT EXISTS public.newsletter_suppressions (
  email text PRIMARY KEY,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  source text
);

GRANT ALL ON public.newsletter_suppressions TO service_role;

ALTER TABLE public.newsletter_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suppressions"
ON public.newsletter_suppressions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.newsletter_suppressions (email, unsubscribed_at, source)
SELECT lower(email), coalesce(unsubscribed_at, now()), 'backfill'
FROM public.newsletter_subscribers
WHERE unsubscribed_at IS NOT NULL
ON CONFLICT (email) DO NOTHING;