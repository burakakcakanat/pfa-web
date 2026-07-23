
CREATE TABLE public.podcast_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  spotify_url TEXT NOT NULL,
  spotify_embed_url TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.podcast_episodes TO anon, authenticated;
GRANT ALL ON public.podcast_episodes TO service_role;

ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published podcast episodes"
  ON public.podcast_episodes FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can read all podcast episodes"
  ON public.podcast_episodes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER podcast_episodes_updated_at
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
