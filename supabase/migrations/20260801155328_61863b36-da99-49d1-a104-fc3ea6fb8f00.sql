ALTER TABLE public.book_editions ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE public.book_editions DROP CONSTRAINT IF EXISTS book_editions_language_check;
ALTER TABLE public.book_editions ADD CONSTRAINT book_editions_language_check CHECK (language IN ('tr','en'));

UPDATE public.book_editions SET language = 'tr' WHERE book_key = 'pfa' AND format = 'google_play';
UPDATE public.book_editions SET language = 'en' WHERE format IN ('kindle','paperback');