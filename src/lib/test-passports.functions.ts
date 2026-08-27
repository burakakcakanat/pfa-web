// Test pasaportları: panel testleri için üç sabit hesap.
// Donuk yüzeylere dokunulmaz; yalnızca auth admin API + roller/hesap satırı.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PassportKind = "user" | "practitioner" | "fellow";

export type PassportSpec = {
  kind: PassportKind;
  email: string;
  label: string;
  fullName: string;
};

// Kısıt koda sabit: yalnızca bu üç adres.
export const TEST_PASSPORTS: PassportSpec[] = [
  {
    kind: "user",
    email: "test-son-kullanici@pfa.internal",
    label: "Son Kullanıcı Paneli",
    fullName: "Test Son Kullanıcı",
  },
  {
    kind: "practitioner",
    email: "test-pfap@pfa.internal",
    label: "PFAP Paneli",
    fullName: "Test PFAP",
  },
  {
    kind: "fellow",
    email: "test-fellow@pfa.internal",
    label: "Fellow Paneli",
    fullName: "Test Fellow",
  },
];

const ALLOWED_EMAILS = TEST_PASSPORTS.map((p) => p.email);

export type PassportStatus = {
  email: string;
  kind: PassportKind;
  label: string;
  exists: boolean;
  created: boolean;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getTestPassportStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PassportStatus[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("email", ALLOWED_EMAILS);
    const have = new Set((data ?? []).map((r) => String(r.email ?? "").toLowerCase()));
    return TEST_PASSPORTS.map((p) => ({
      email: p.email,
      kind: p.kind,
      label: p.label,
      exists: have.has(p.email),
      created: false,
    }));
  });

/** Üç test hesabını (yoksa) oluşturur; varsa dokunmaz. Şifreler saklanmaz. */
export const ensureTestPassports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PassportStatus[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const out: PassportStatus[] = [];

    for (const spec of TEST_PASSPORTS) {
      let userId: string | null = null;
      let created = false;

      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", spec.email)
        .maybeSingle();
      if (prof?.id) userId = prof.id;

      if (!userId) {
        // Rastgele şifre — hiçbir yerde saklanmaz, döndürülmez, loglanmaz.
        const password = crypto.randomUUID() + crypto.randomUUID();
        const { data: cu, error: cuErr } = await supabaseAdmin.auth.admin.createUser({
          email: spec.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: spec.fullName, is_test_passport: true },
        });
        if (cuErr) {
          // Zaten varsa listeden bul.
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 200,
          });
          const found = list?.users?.find(
            (u) => (u.email ?? "").toLowerCase() === spec.email,
          );
          if (!found) throw new Error(`${spec.email}: ${cuErr.message}`);
          userId = found.id;
        } else {
          userId = cu.user?.id ?? null;
          created = true;
        }
      }

      if (!userId) throw new Error(`${spec.email}: kullanıcı kimliği çözülemedi`);

      await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: userId, email: spec.email, full_name: spec.fullName },
          { onConflict: "id" },
        );

      const roles: Array<"user" | "pro" | "fellow"> =
        spec.kind === "user"
          ? ["user"]
          : spec.kind === "practitioner"
            ? ["user", "pro"]
            : ["user", "pro", "fellow"];
      for (const role of roles) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      }

      if (spec.kind !== "user") {
        const { data: acc } = await supabaseAdmin
          .from("practitioner_accounts")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!acc) {
          const { data: code } = await supabaseAdmin.rpc("gen_referral_code");
          await supabaseAdmin.from("practitioner_accounts").insert({
            user_id: userId,
            tier: spec.kind === "fellow" ? "fellow" : "practitioner",
            client_quota: spec.kind === "fellow" ? 7 : 3,
            client_used: 0,
            referral_code: String(code ?? `TEST${Date.now().toString(36).toUpperCase()}`),
            license_granted_at: new Date().toISOString(),
            ...(spec.kind === "fellow" ? { subscription_status: "aktif" } : {}),
          });
        }
      }

      out.push({
        email: spec.email,
        kind: spec.kind,
        label: spec.label,
        exists: true,
        created,
      });
    }

    return out;
  });

/** Yalnızca üç test pasaportu için tek kullanımlık magic-link üretir. */
export const createPassportLoginLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }): Promise<{ link: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const email = data.email.trim().toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) {
      throw new Error("Bu araç yalnızca test pasaportları için kullanılabilir.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) throw new Error(error.message);
    const action = link?.properties?.action_link;
    if (!action) throw new Error("Giriş bağlantısı üretilemedi.");
    return { link: action };
  });
