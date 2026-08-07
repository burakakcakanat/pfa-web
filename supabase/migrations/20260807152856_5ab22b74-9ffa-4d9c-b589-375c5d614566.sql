CREATE TABLE public.session_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Reserved for the future practitioner-scoped availability. NULL = the
  -- owner's own availability (current behaviour). When practitioner selection
  -- ships, the public form filters by the chosen practitioner_id and NULL rows
  -- stay as the default/owner set — no data migration needed.
  practitioner_id uuid REFERENCES public.practitioners(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  slot_time time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX session_availability_unique_slot
  ON public.session_availability (COALESCE(practitioner_id, '00000000-0000-0000-0000-000000000000'::uuid), weekday, slot_time);

GRANT SELECT ON public.session_availability TO anon;
GRANT SELECT ON public.session_availability TO authenticated;
GRANT ALL ON public.session_availability TO service_role;

ALTER TABLE public.session_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active availability is publicly readable"
  ON public.session_availability FOR SELECT
  TO anon, authenticated
  USING (active);

CREATE POLICY "Admins manage availability"
  ON public.session_availability FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER session_availability_set_updated_at
  BEFORE UPDATE ON public.session_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.session_availability (weekday, slot_time, sort_order) VALUES
  (1, '10:00', 10), (1, '14:00', 20), (1, '16:00', 30),
  (2, '10:00', 10), (2, '14:00', 20), (2, '16:00', 30),
  (3, '11:00', 10), (3, '15:00', 20),
  (4, '10:00', 10), (4, '14:00', 20), (4, '17:00', 30),
  (5, '11:00', 10), (5, '15:00', 20);