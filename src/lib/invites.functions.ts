import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Davet linkinin (pro_client_invites.token) danışan tarafındaki çözümü.
 * Kimlik doğrulaması istemez: davet linki zaten tahmin edilemez bir token.
 * PRIVACY: yalnızca davet modu, uygulayıcının adı ve referans kodu döner.
 */
export const resolveProInvite = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("pro_client_invites")
      .select("id, pro_user_id, client_name, status, mode")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return null;

    const [{ data: prof }, { data: acc }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("id", invite.pro_user_id).maybeSingle(),
      supabaseAdmin
        .from("practitioner_accounts")
        .select("referral_code")
        .eq("user_id", invite.pro_user_id)
        .maybeSingle(),
    ]);


    return {
      status: invite.status as string,
      // 'kota' → ücretsiz (uygulayıcının kotasından düşmüş);
      // 'paid' → danışan indirimli olarak kendi ödemesini yapar.
      mode: (invite.mode ?? "kota") as "kota" | "paid",
      client_name: invite.client_name,
      practitioner_name: prof?.full_name ?? null,
      referral_code: invite.mode === "paid" ? acc?.referral_code ?? null : null,
    };
  });
