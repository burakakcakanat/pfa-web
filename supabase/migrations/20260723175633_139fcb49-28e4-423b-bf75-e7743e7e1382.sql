DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_update_blog_post(text, text, text) TO sandbox_exec';
END IF; END $$;