ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bundle_slug text;
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_bundle_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle public.bundles;
  v_item RECORD;
  v_slug TEXT;
  v_type public.entitlement_type;
  v_meta jsonb;
  v_book_lang text;
  v_book_slug text;
  v_buyer_name text;
  v_buyer_email text;
BEGIN
  IF NEW.status <> 'paid' OR (OLD.status IS NOT NULL AND OLD.status = 'paid') THEN RETURN NEW; END IF;
  IF NEW.bundle_slug IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_bundle FROM public.bundles WHERE slug = NEW.bundle_slug;
  IF v_bundle.id IS NULL THEN RETURN NEW; END IF;

  -- her bileşen için entitlement oluştur
  FOR v_item IN SELECT product_slug FROM public.bundle_items WHERE bundle_id = v_bundle.id LOOP
    v_slug := v_item.product_slug;
    v_type := CASE v_slug
      WHEN 'danismanlik-oturumu' THEN 'session'::public.entitlement_type
      WHEN 'bilinc-seviyeleri-calismalari' THEN 'webinar_bsc'::public.entitlement_type
      WHEN 'tam-assessment-rapor' THEN 'assessment_full'::public.entitlement_type
      ELSE NULL
    END;
    IF v_type IS NOT NULL THEN
      INSERT INTO public.user_entitlements (user_id, type, source_order_id, metadata)
      VALUES (NEW.user_id, v_type, NEW.id, jsonb_build_object('product_slug', v_slug, 'bundle_slug', NEW.bundle_slug));
    END IF;
  END LOOP;

  -- kitap dâhilse metadata->>book_lang'e göre ebook entitlement + hediye desteği
  IF v_bundle.includes_book THEN
    v_book_lang := COALESCE(NEW.metadata->>'book_lang','tr');
    v_book_slug := CASE v_bundle.book_key || '-' || v_book_lang
      WHEN 'pfa-tr' THEN 'pfa-ebook-tr'
      WHEN 'pfa-en' THEN 'pfa-ebook-en'
      WHEN 'hcd-en' THEN 'hcd-ebook-en'
      ELSE NULL
    END;
    IF v_book_slug IS NOT NULL THEN
      SELECT full_name, email INTO v_buyer_name, v_buyer_email FROM public.profiles WHERE id = NEW.user_id;
      v_meta := jsonb_build_object(
        'product_slug', v_book_slug,
        'bundle_slug', NEW.bundle_slug,
        'recipient_name', COALESCE(NULLIF(v_buyer_name,''), v_buyer_email, ''),
        'recipient_email', COALESCE(v_buyer_email,''),
        'is_gift', false
      );
      INSERT INTO public.user_entitlements (user_id, type, source_order_id, metadata)
      VALUES (NEW.user_id, 'ebook'::public.entitlement_type, NEW.id, v_meta);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_bundle_paid ON public.orders;
CREATE TRIGGER trg_orders_bundle_paid
AFTER UPDATE ON public.orders
FOR EACH ROW WHEN (NEW.status = 'paid') EXECUTE FUNCTION public.handle_bundle_paid();

-- mevcut ürün-bazlı trigger'ı da bağla (varsa)
DROP TRIGGER IF EXISTS trg_orders_paid ON public.orders;
CREATE TRIGGER trg_orders_paid
AFTER UPDATE ON public.orders
FOR EACH ROW WHEN (NEW.status = 'paid') EXECUTE FUNCTION public.handle_order_paid();