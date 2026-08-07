-- 1. purchase_inquiries: add-on selection + fulfilment bookkeeping
ALTER TABLE public.purchase_inquiries
  ADD COLUMN IF NOT EXISTS addon_bundle_slug text,
  ADD COLUMN IF NOT EXISTS fulfil_kind text,
  ADD COLUMN IF NOT EXISTS fulfil_slug text,
  ADD COLUMN IF NOT EXISTS fulfil_book_lang text NOT NULL DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS granted jsonb,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamp with time zone;

ALTER TABLE public.purchase_inquiries
  DROP CONSTRAINT IF EXISTS purchase_inquiries_fulfil_kind_chk;
ALTER TABLE public.purchase_inquiries
  ADD CONSTRAINT purchase_inquiries_fulfil_kind_chk
  CHECK (fulfil_kind IS NULL OR fulfil_kind IN ('product','bundle'));

ALTER TABLE public.purchase_inquiries
  DROP CONSTRAINT IF EXISTS purchase_inquiries_fulfil_book_lang_chk;
ALTER TABLE public.purchase_inquiries
  ADD CONSTRAINT purchase_inquiries_fulfil_book_lang_chk
  CHECK (fulfil_book_lang IN ('tr','en'));

-- assessment + ebook enquiries now flow through the same channel
ALTER TABLE public.purchase_inquiries DROP CONSTRAINT IF EXISTS purchase_inquiries_kind_chk;
ALTER TABLE public.purchase_inquiries
  ADD CONSTRAINT purchase_inquiries_kind_chk
  CHECK (kind IN ('session','webinar','pro_license','corporate','assessment','ebook'));

-- 2. session_requests: a session credit spent on a requested time.
-- FUTURE: practitioner_id is already here; when practitioner booking ships the
-- public form filters availability by it. NULL = the owner's own calendar.
CREATE TABLE IF NOT EXISTS public.session_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_id uuid REFERENCES public.user_entitlements(id) ON DELETE SET NULL,
  inquiry_id uuid REFERENCES public.purchase_inquiries(id) ON DELETE SET NULL,
  practitioner_id uuid REFERENCES public.practitioners(id) ON DELETE SET NULL,
  preferred_slot text NOT NULL DEFAULT '',
  preferred_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_requests_status_chk
    CHECK (status IN ('pending','confirmed','completed','cancelled'))
);

GRANT SELECT, INSERT, UPDATE ON public.session_requests TO authenticated;
GRANT ALL ON public.session_requests TO service_role;
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own session requests" ON public.session_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all session requests" ON public.session_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own session requests" ON public.session_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update session requests" ON public.session_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER session_requests_set_updated_at
  BEFORE UPDATE ON public.session_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS session_requests_user_idx ON public.session_requests(user_id);

-- 3. Grants held for customers who have no account yet.
CREATE TABLE IF NOT EXISTS public.pending_entitlement_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  entitlement_type public.entitlement_type NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  inquiry_id uuid REFERENCES public.purchase_inquiries(id) ON DELETE SET NULL,
  claimed_at timestamp with time zone,
  claimed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Server-only table: no anon/authenticated grants, RLS on with no policies.
GRANT ALL ON public.pending_entitlement_grants TO service_role;
ALTER TABLE public.pending_entitlement_grants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS pending_grants_email_idx
  ON public.pending_entitlement_grants (lower(email)) WHERE claimed_at IS NULL;

-- 4. On signup, claim anything held for that e-mail address.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE g RECORD;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'burakakcakanat@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;

  FOR g IN
    SELECT * FROM public.pending_entitlement_grants
    WHERE lower(email) = lower(NEW.email) AND claimed_at IS NULL
  LOOP
    INSERT INTO public.user_entitlements (user_id, type, metadata)
    VALUES (NEW.id, g.entitlement_type, g.metadata);
    UPDATE public.pending_entitlement_grants
       SET claimed_at = now(), claimed_by = NEW.id
     WHERE id = g.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 5. Webinar + signed book package so the webinar page can carry an offer.
INSERT INTO public.bundles
  (slug, name_tr, name_en, book_key, includes_book, pricing_mode, discount_percent, active, sort_order)
VALUES
  ('pfa-webinar-kitap', 'Bilinç Seviyeleri Çalışmaları + İmzalı E-Kitap',
   'Levels of Consciousness Workshop + signed e-book',
   'pfa', true, 'sum_minus_percent', 10, true, 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.bundle_items (bundle_id, product_slug, quantity)
SELECT b.id, 'bilinc-seviyeleri-calismalari', 1 FROM public.bundles b
WHERE b.slug = 'pfa-webinar-kitap'
  AND NOT EXISTS (
    SELECT 1 FROM public.bundle_items bi
    WHERE bi.bundle_id = b.id AND bi.product_slug = 'bilinc-seviyeleri-calismalari'
  );