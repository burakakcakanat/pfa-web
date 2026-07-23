CREATE OR REPLACE FUNCTION public.admin_update_blog_post(_slug text, _cover text, _content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts SET cover_image_url = _cover, content = _content WHERE slug = _slug;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_blog_post(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_blog_post(text, text, text) TO service_role;