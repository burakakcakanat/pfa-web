ALTER TABLE public.practitioner_accounts ALTER COLUMN certificate_status SET DEFAULT 'pending';

UPDATE public.practitioner_accounts
   SET certificate_status = CASE certificate_status
     WHEN 'beklemede' THEN 'pending'
     WHEN 'verildi' THEN 'issued'
     WHEN 'iptal' THEN 'revoked'
     ELSE 'pending' END
 WHERE certificate_status NOT IN ('pending','issued','revoked');

ALTER TABLE public.practitioner_accounts DROP CONSTRAINT IF EXISTS practitioner_accounts_certificate_status_check;
ALTER TABLE public.practitioner_accounts
  ADD CONSTRAINT practitioner_accounts_certificate_status_check
  CHECK (certificate_status IN ('pending','issued','revoked'));