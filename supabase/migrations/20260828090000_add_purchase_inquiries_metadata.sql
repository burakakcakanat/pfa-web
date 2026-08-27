-- Add a generic metadata jsonb column to purchase_inquiries so intent-style
-- fields (e.g. badge_intent for license requests) can be recorded without
-- touching the pricing/commission columns.
ALTER TABLE public.purchase_inquiries
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
