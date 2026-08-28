// Uygulayıcı Paneli (PFAP / Fellow) — okuma + fatura bilgisi + Fellow yükseltme talebi.
// Donuk yüzeyler (handle_order_paid, komisyon motoru fonksiyonları, create_pro_invite,
// checkout fiyat mantığı, RLS politikaları) burada YALNIZCA okunur.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PractitionerTier = "practitioner" | "fellow";

export type LedgerRow = {
  id: string;
  created_at: string;
  product_slug: string | null;
  gross_amount_cents: number;
  currency: string;
  commission_rate_pct: number;
  commission_amount_cents: number;
  status: string;
  tier_at_time: string | null;
};

export type StatementRow = {
  id: string;
  period_start: string;
  period_end: string;
  currency: string;
  total_amount_cents: number;
  status: string;
  odeme_tarihi: string | null;
};

export type PractitionerBilling = {
  iban: string;
  fatura_unvani: string;
  vergi_no: string;
  vergi_dairesi: string;
  adres: string;
  updated_at: string | null;
};

export type PractitionerPanel = {
  hasLicense: boolean;
  tier: PractitionerTier;
  referralCode: string | null;
  licenseGrantedAt: string | null;
  licenseValidUntil: string | null;
  certificateStatus: string | null;
  subscriptionStatus: string | null;
  subscriptionRenewsAt: string | null;
  quota: { total: number; used: number; remaining: number };
  ledger: LedgerRow[];
  pendingByCurrency: Record<string, number>;
  earnedTotalByCurrency: Record<string, number>;
  earnedPeriodByCurrency: Record<string, number>;
  statements: StatementRow[];
  performance: { invitesSent: number; invitesCompleted: number };
  billing: PractitionerBilling | null;
  fellowRequestOpen: boolean;
  /** Fiyat & Oran Merkezi'nden okunur (abonelik.fellow_bedel) — hardcode edilmez. */
  fellowSubscriptionUsd: number | null;
};


const FELLOW_REQUEST_SLUG = "pfa-fellow-abonelik";

export const getPractitionerPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PractitionerPanel> => {
    const { supabase, userId } = context;

    const [accRes, ledgerRes, stmtRes, invitesRes, billingRes] = await Promise.all([
      supabase
        .from("practitioner_accounts")
        .select(
          "tier, referral_code, client_quota, client_used, license_granted_at, license_valid_until, certificate_status, subscription_status, subscription_renews_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("commission_ledger")
        .select(
          "id, created_at, product_slug, gross_amount_cents, currency, commission_rate_pct, commission_amount_cents, status, tier_at_time",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("commission_statements")
        .select("id, period_start, period_end, currency, total_amount_cents, status, odeme_tarihi")
        .order("period_start", { ascending: false })
        .limit(24),
      supabase.from("pro_client_invites").select("id, status"),
      supabase
        .from("practitioner_billing")
        .select("iban, fatura_unvani, vergi_no, vergi_dairesi, adres, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const acc = accRes.data;
    const ledger = (ledgerRes.data ?? []) as LedgerRow[];

    const pendingByCurrency: Record<string, number> = {};
    const earnedTotalByCurrency: Record<string, number> = {};
    const earnedPeriodByCurrency: Record<string, number> = {};
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).getTime();
    for (const l of ledger) {
      const cur = (l.currency || "usd").toLowerCase();
      earnedTotalByCurrency[cur] = (earnedTotalByCurrency[cur] ?? 0) + l.commission_amount_cents;
      if (l.status !== "odendi") {
        pendingByCurrency[cur] = (pendingByCurrency[cur] ?? 0) + l.commission_amount_cents;
      }
      if (new Date(l.created_at).getTime() >= periodStart) {
        earnedPeriodByCurrency[cur] = (earnedPeriodByCurrency[cur] ?? 0) + l.commission_amount_cents;
      }
    }

    const invites = (invitesRes.data ?? []) as Array<{ id: string; status: string }>;

    let fellowRequestOpen = false;
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = String(prof?.email ?? "").trim().toLowerCase();
    if (email) {
      const { data: open } = await supabase
        .from("purchase_inquiries")
        .select("id")
        .eq("email", email)
        .eq("product_slug", FELLOW_REQUEST_SLUG)
        .not("status", "in", "(closed,fulfilled)")
        .limit(1);
      fellowRequestOpen = !!open && open.length > 0;
    }

    const quotaTotal = acc?.client_quota ?? 0;
    const quotaUsed = acc?.client_used ?? 0;

    // Fellow abonelik bedeli tek doğruluk kaynağından (system_rates) okunur.
    let fellowSubscriptionUsd: number | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rate } = await supabaseAdmin
        .from("system_rates")
        .select("value_numeric")
        .eq("key", "abonelik.fellow_bedel")
        .maybeSingle();
      if (rate?.value_numeric != null) fellowSubscriptionUsd = Number(rate.value_numeric);
    } catch {
      fellowSubscriptionUsd = null;
    }

    return {
      hasLicense: !!acc,

      tier: ((acc?.tier as PractitionerTier) ?? "practitioner") as PractitionerTier,
      referralCode: acc?.referral_code ?? null,
      licenseGrantedAt: acc?.license_granted_at ?? null,
      licenseValidUntil: acc?.license_valid_until ?? null,
      certificateStatus: acc?.certificate_status ?? null,
      subscriptionStatus: acc?.subscription_status ?? null,
      subscriptionRenewsAt: acc?.subscription_renews_at ?? null,
      quota: { total: quotaTotal, used: quotaUsed, remaining: Math.max(0, quotaTotal - quotaUsed) },
      ledger,
      pendingByCurrency,
      earnedTotalByCurrency,
      earnedPeriodByCurrency,
      statements: (stmtRes.data ?? []) as StatementRow[],
      performance: {
        invitesSent: invites.length,
        invitesCompleted: invites.filter((i) => i.status === "completed").length,
      },
      billing: (billingRes.data ?? null) as PractitionerBilling | null,
      fellowRequestOpen,
      fellowSubscriptionUsd,
    };

  });

const billingSchema = z.object({
  iban: z.string().trim().max(60).optional().default(""),
  fatura_unvani: z.string().trim().max(200).optional().default(""),
  vergi_no: z.string().trim().max(40).optional().default(""),
  vergi_dairesi: z.string().trim().max(120).optional().default(""),
  adres: z.string().trim().max(600).optional().default(""),
});

export const savePractitionerBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => billingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("practitioner_billing")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** PFAP → Fellow yükseltme talebi. Ödeme altyapısı bağlanana kadar talep rayı. */
export const requestFellowUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", uid)
      .maybeSingle();
    const email = String(
      prof?.email ?? (context.claims as { email?: string } | null)?.email ?? "",
    )
      .trim()
      .toLowerCase();
    if (!email) throw new Error("Hesabınızda kayıtlı e-posta bulunamadı.");

    const { data: open } = await supabaseAdmin
      .from("purchase_inquiries")
      .select("id")
      .eq("email", email)
      .eq("product_slug", FELLOW_REQUEST_SLUG)
      .not("status", "in", "(closed,fulfilled)")
      .limit(1);
    if (open && open.length > 0) return { ok: true, already: true };

    const { createPurchaseInquiry } = await import("@/lib/purchase-inquiries.server");
    await createPurchaseInquiry({
      kind: "pro_license",
      product_slug: FELLOW_REQUEST_SLUG,
      product_label: "Fellow aboneliği",
      full_name: prof?.full_name || email,
      email,
      phone: "",
      preferred_slot: "",
      message: "Fellow aboneliği talebi (panel)",
      addon_bundle_slug: null,
      book_lang: "tr",
      locale: "tr",
      badge_intent: "fellow",
      website_hp: "",
    });

    return { ok: true, already: false };
  });
