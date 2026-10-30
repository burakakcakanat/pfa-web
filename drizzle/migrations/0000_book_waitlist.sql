CREATE TABLE public.book_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_slug text NOT NULL,
  is_gift boolean NOT NULL DEFAULT false,
  recipient_name text,
  recipient_email text,
  gift_note text,
  dedication_name text,
  source text NOT NULL DEFAULT 'site',
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','notified','converted','cancelled')),
  notified_at timestamptz,
  converted_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX book_waitlist_user_idx ON public.book_waitlist(user_id);
GRANT SELECT, INSERT, UPDATE ON public.book_waitlist TO authenticated;
GRANT ALL ON public.book_waitlist TO service_role;
ALTER TABLE public.book_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own waitlist select" ON public.book_waitlist FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own waitlist insert" ON public.book_waitlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'waiting' AND notified_at IS NULL AND converted_order_id IS NULL);
CREATE POLICY "own waitlist update" ON public.book_waitlist FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER book_waitlist_updated_at BEFORE UPDATE ON public.book_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.system_rates (key, kategori, label_tr, label_en, value_type, value_numeric, currency, aciklama, min_value, max_value)
VALUES ('indirim.bekleme_listesi_kitap','indirim','Bekleme listesi kitap indirimi (%)','Waitlist book discount (%)','percent',10,NULL,'Bekleme listesine kayıtlı kullanıcılara kitapta süresiz uygulanır; ödeme günündeki güncel fiyattan düşülür.',0,100)
ON CONFLICT (key) DO NOTHING;