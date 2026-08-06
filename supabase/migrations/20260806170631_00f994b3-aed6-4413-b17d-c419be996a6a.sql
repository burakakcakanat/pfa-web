ALTER TABLE public.purchase_inquiries ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'tr';
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'tr';
ALTER TABLE public.practitioner_inquiries ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'tr';
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'tr';
ALTER TABLE public.assessment_sessions ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'tr';
ALTER TABLE public.sevenq_sessions ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'tr';

ALTER TABLE public.purchase_inquiries ADD CONSTRAINT purchase_inquiries_locale_chk CHECK (locale IN ('tr','en'));
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_locale_chk CHECK (locale IN ('tr','en'));
ALTER TABLE public.practitioner_inquiries ADD CONSTRAINT practitioner_inquiries_locale_chk CHECK (locale IN ('tr','en'));
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_locale_chk CHECK (locale IN ('tr','en'));
ALTER TABLE public.assessment_sessions ADD CONSTRAINT assessment_sessions_locale_chk CHECK (locale IN ('tr','en'));
ALTER TABLE public.sevenq_sessions ADD CONSTRAINT sevenq_sessions_locale_chk CHECK (locale IN ('tr','en'));

UPDATE public.purchase_inquiries SET locale = 'tr' WHERE locale IS DISTINCT FROM 'en';
UPDATE public.contact_messages SET locale = 'tr' WHERE locale IS DISTINCT FROM 'en';
UPDATE public.newsletter_subscribers SET locale = 'tr' WHERE locale IS DISTINCT FROM 'en';
UPDATE public.assessment_sessions SET locale = 'tr' WHERE locale IS DISTINCT FROM 'en';
UPDATE public.sevenq_sessions SET locale = 'tr' WHERE locale IS DISTINCT FROM 'en';