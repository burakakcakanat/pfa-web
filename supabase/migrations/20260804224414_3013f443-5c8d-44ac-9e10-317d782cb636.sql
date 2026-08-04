CREATE TABLE public.purchase_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'session',
  product_slug text NOT NULL,
  product_label text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  preferred_slot text,
  message text,
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  ip_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchase_inquiries_status_chk CHECK (status IN ('new','contacted','paid','fulfilled','closed')),
  CONSTRAINT purchase_inquiries_kind_chk CHECK (kind IN ('session','webinar','pro_license','corporate'))
);

GRANT INSERT ON public.purchase_inquiries TO anon;
GRANT INSERT ON public.purchase_inquiries TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.purchase_inquiries TO authenticated;
GRANT ALL ON public.purchase_inquiries TO service_role;

ALTER TABLE public.purchase_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a purchase inquiry"
  ON public.purchase_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read purchase inquiries"
  ON public.purchase_inquiries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update purchase inquiries"
  ON public.purchase_inquiries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete purchase inquiries"
  ON public.purchase_inquiries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX purchase_inquiries_created_at_idx ON public.purchase_inquiries (created_at DESC);
CREATE INDEX purchase_inquiries_email_idx ON public.purchase_inquiries (email);
CREATE INDEX purchase_inquiries_ip_hash_idx ON public.purchase_inquiries (ip_hash);

CREATE TRIGGER purchase_inquiries_set_updated_at
  BEFORE UPDATE ON public.purchase_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();