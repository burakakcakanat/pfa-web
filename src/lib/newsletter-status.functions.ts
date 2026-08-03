import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bülten durumu ve açma/kapama — hepsi oturumdaki kullanıcının KENDİ hesap
 * e-postası için. E-posta istemciden alınmaz; sunucuda oturumdan okunur, bu
 * yüzden newsletter_subscribers için istemci okuma yolu açılmaz ve RLS
 * gevşetilmez. Abonelik/çıkış işlemleri paylaşılan çekirdeği çağırır.
 */

async function sessionEmail(context: any): Promise<string | null> {
  const { data } = await context.supabase.auth.getUser();
  return data.user?.email?.toLowerCase().trim() ?? null;
}

export const getMyNewsletterStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await sessionEmail(context);
    if (!email) return { subscribed: false, confirmed: false, email: null as string | null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: row }, { data: supp }] = await Promise.all([
      supabaseAdmin
        .from("newsletter_subscribers")
        .select("id, confirmed")
        .eq("email", email)
        .is("unsubscribed_at", null)
        .maybeSingle(),
      supabaseAdmin.from("newsletter_suppressions").select("email").eq("email", email).maybeSingle(),
    ]);

    const active = Boolean(row) && !supp;
    return { subscribed: active, confirmed: active && Boolean(row?.confirmed), email };
  });

export const subscribeMeToNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await sessionEmail(context);
    if (!email) throw new Error("Hesap e-postası bulunamadı.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { subscribeCore } = await import("@/lib/newsletter-core.server");
    return subscribeCore(supabaseAdmin, { email, segment: "merakli", source: "hesabim" });
  });

export const unsubscribeMeFromNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await sessionEmail(context);
    if (!email) throw new Error("Hesap e-postası bulunamadı.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { unsubscribeCore } = await import("@/lib/newsletter-core.server");
    return unsubscribeCore(supabaseAdmin, email, "account");
  });
