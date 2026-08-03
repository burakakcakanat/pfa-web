import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns ONLY a boolean: whether the signed-in user's own account email is an
 * active newsletter subscriber. Takes no input — the email is read server-side
 * from the authenticated session, so no client read path to
 * newsletter_subscribers is created and no RLS is loosened.
 */
export const getMyNewsletterStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: userData } = await context.supabase.auth.getUser();
    const email = userData.user?.email?.toLowerCase().trim();
    if (!email) return { subscribed: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", email)
      .is("unsubscribed_at", null)
      .maybeSingle();

    return { subscribed: Boolean(data) };
  });
