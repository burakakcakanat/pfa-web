
-- Revoke execute from PUBLIC and anon on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_order_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_client_quota(uuid, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_pro_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_ebook_gift(text) FROM PUBLIC, anon;

-- Grant execute only where needed
-- has_role: used by RLS policies evaluated as authenticated role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- RPCs invoked by signed-in users
GRANT EXECUTE ON FUNCTION public.admin_set_client_quota(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pro_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ebook_gift(text) TO authenticated;
