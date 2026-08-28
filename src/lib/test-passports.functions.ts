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
  /** Roller tam mı (user / +pro / +fellow). */
  rolesOk: boolean;
  /** practitioner_accounts satırı gerekiyorsa var mı. */
  accountOk: boolean;
  /** Roller + hesap satırı tam mı. */
  ready: boolean;
};

function rolesFor(kind: PassportKind): Array<"user" | "pro" | "fellow"> {
  return kind === "user"
    ? ["user"]
    : kind === "practitioner"
      ? ["user", "pro"]
      : ["user", "pro", "fellow"];
}

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
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("email", ALLOWED_EMAILS);
    const byEmail = new Map(
      (profiles ?? []).map((r) => [String(r.email ?? "").toLowerCase(), r.id as string]),
    );
    const ids = Array.from(byEmail.values());

    const [rolesRes, accRes] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin.from("practitioner_accounts").select("user_id").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const roleSet = new Set(
      ((rolesRes.data ?? []) as any[]).map((r) => `${r.user_id}:${r.role}`),
    );
    const accSet = new Set(((accRes.data ?? []) as any[]).map((r) => r.user_id as string));

    return TEST_PASSPORTS.map((p) => {
      const uid = byEmail.get(p.email);
      const exists = !!uid;
      const rolesOk = !!uid && rolesFor(p.kind).every((r) => roleSet.has(`${uid}:${r}`));
      const accountOk = p.kind === "user" ? true : !!uid && accSet.has(uid);
      return {
        email: p.email,
        kind: p.kind,
        label: p.label,
        exists,
        created: false,
        rolesOk,
        accountOk,
        ready: exists && rolesOk && accountOk,
      };
    });
  });


/**
 * İdempotent onarım: her çalıştırmada üç hesabın varlığını, rollerini ve
 * practitioner_accounts satırlarını tek tek doğrular, eksikleri tamamlar.
 * Hiçbir adım sessizce yutulmaz — hata olursa hangi hesap/adım olduğu bildirilir.
 * Şifreler rastgele üretilir ve hiçbir yerde saklanmaz.
 */
export const ensureTestPassports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PassportStatus[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const out: PassportStatus[] = [];
    const problems: string[] = [];

    for (const spec of TEST_PASSPORTS) {
      try {
        let userId: string | null = null;
        let created = false;

        const { data: prof, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", spec.email)
          .maybeSingle();
        if (profErr) throw new Error(`profil okunamadı: ${profErr.message}`);
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
            if (!found) throw new Error(`kullanıcı oluşturulamadı: ${cuErr.message}`);
            userId = found.id;
          } else {
            userId = cu.user?.id ?? null;
            created = true;
          }
        }

        if (!userId) throw new Error("kullanıcı kimliği çözülemedi");

        const { error: pErr } = await supabaseAdmin
          .from("profiles")
          .upsert(
            { id: userId, email: spec.email, full_name: spec.fullName },
            { onConflict: "id" },
          );
        if (pErr) throw new Error(`profil yazılamadı: ${pErr.message}`);

        // ROLLER — her çalıştırmada tek tek kontrol edilip eksik olan eklenir.
        const wanted = rolesFor(spec.kind);
        const { data: haveRoles, error: rErr } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (rErr) throw new Error(`roller okunamadı: ${rErr.message}`);
        const haveSet = new Set((haveRoles ?? []).map((r) => r.role as string));
        for (const role of wanted) {
          if (haveSet.has(role)) continue;
          const { error } = await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
          if (error) throw new Error(`rol eklenemedi (${role}): ${error.message}`);
        }

        // UYGULAYICI HESABI — eksikse oluşturulur; referral kodu çakışırsa yeniden denenir.
        if (spec.kind !== "user") {
          const { data: acc, error: accErr } = await supabaseAdmin
            .from("practitioner_accounts")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (accErr) throw new Error(`hesap okunamadı: ${accErr.message}`);

          if (!acc) {
            let inserted = false;
            let lastError = "";
            for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
              const { data: code } = await supabaseAdmin.rpc("gen_referral_code");
              const referral = String(
                code ?? `TEST${Date.now().toString(36).toUpperCase()}${attempt}`,
              );
              const { error } = await supabaseAdmin.from("practitioner_accounts").insert({
                user_id: userId,
                tier: spec.kind === "fellow" ? "fellow" : "practitioner",
                client_quota: spec.kind === "fellow" ? 7 : 3,
                client_used: 0,
                referral_code: referral,
                license_granted_at: new Date().toISOString(),
                ...(spec.kind === "fellow" ? { subscription_status: "aktif" } : {}),
              });
              if (!error) {
                inserted = true;
                break;
              }
              lastError = error.message;
              // 23505 = unique violation (referral kodu çakışması) → yeniden dene.
              if (!/duplicate key|23505/i.test(error.message)) break;
            }
            if (!inserted) throw new Error(`uygulayıcı hesabı açılamadı: ${lastError}`);
          }
        }

        out.push({
          email: spec.email,
          kind: spec.kind,
          label: spec.label,
          exists: true,
          created,
          rolesOk: true,
          accountOk: true,
          ready: true,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        problems.push(`${spec.email}: ${msg}`);
        out.push({
          email: spec.email,
          kind: spec.kind,
          label: spec.label,
          exists: false,
          created: false,
          rolesOk: false,
          accountOk: false,
          ready: false,
        });
      }
    }

    if (problems.length) {
      throw new Error(`Bazı test pasaportları hazırlanamadı — ${problems.join(" | ")}`);
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
