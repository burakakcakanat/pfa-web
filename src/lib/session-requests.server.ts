// Server-only admin side of session requests. Confirmation is always manual.
import type { AdminSessionRequestRow, SessionRequestStatus } from "@/lib/session-requests";

const COLS =
  "id, user_id, status, preferred_slot, confirmed_at, admin_note, created_at, practitioner_id";

export async function listAdminSessionRequests(): Promise<AdminSessionRequestRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("session_requests")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as AdminSessionRequestRow[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.id as string, p]));
    for (const r of rows) {
      const p = byId.get(r.user_id);
      r.full_name = (p?.full_name as string | null) ?? null;
      r.email = (p?.email as string | null) ?? null;
    }
  }
  return rows;
}

export async function updateAdminSessionRequest(input: {
  id: string;
  status?: SessionRequestStatus;
  confirmed_slot?: string;
  admin_note?: string | null;
}): Promise<{ ok: boolean; emailed: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: before } = await supabaseAdmin
    .from("session_requests")
    .select("id, user_id, status, preferred_slot, confirmed_at")
    .eq("id", input.id)
    .maybeSingle();
  if (!before) throw new Error("Seans talebi bulunamadı");

  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.admin_note !== undefined) patch.admin_note = input.admin_note;
  if (input.confirmed_slot !== undefined && input.confirmed_slot !== "") {
    patch.preferred_slot = input.confirmed_slot;
  }
  const becomingConfirmed =
    input.status === "confirmed" && (before as { status: string }).status !== "confirmed";
  if (becomingConfirmed) patch.confirmed_at = new Date().toISOString();
  if (Object.keys(patch).length === 0) return { ok: true, emailed: false };

  const { error } = await supabaseAdmin
    .from("session_requests")
    .update(patch as never)
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  let emailed = false;
  if (becomingConfirmed) {
    try {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, preferred_language")
        .eq("id", (before as { user_id: string }).user_id)
        .maybeSingle();
      if (prof?.email) {
        const { sendEmail } = await import("@/lib/email/send.server");
        const { renderEmail, esc } = await import("@/lib/email/templates");
        const en = (prof.preferred_language ?? "tr") === "en";
        const when = String(
          patch.preferred_slot ?? (before as { preferred_slot: string }).preferred_slot ?? "",
        );
        const firstName = (prof.full_name ?? "").trim().split(/\s+/)[0] || "";
        const res = await sendEmail({
          to: prof.email as string,
          replyTo: "info@psychofunctionalanalysis.com",
          subject: en ? "Your session is confirmed — PFA" : "Seansınız onaylandı — PFA",
          html: renderEmail({
            title: en ? "Your session is confirmed" : "Seansınız onaylandı",
            bodyHtml: en
              ? `<p>Hello ${esc(firstName)},</p>
                 <p>Your one-to-one session is confirmed for <strong>${esc(when)}</strong> (Europe/Istanbul).</p>
                 <p>We will send the online meeting link before the session.</p>
                 <p>Warm regards,<br/>The PFA team</p>`
              : `<p>Merhaba ${esc(firstName)},</p>
                 <p>Birebir seansınız <strong>${esc(when)}</strong> (Europe/Istanbul) için onaylandı.</p>
                 <p>Online görüşme bağlantısını seanstan önce paylaşacağız.</p>
                 <p>Sevgiyle,<br/>PFA Ekibi</p>`,
            ctaLabel: en ? "My sessions" : "Seanslarım",
            ctaHref: "https://psychofunctionalanalysis.com/hesabim?tab=sessions",
          }),
        });
        emailed = res.ok;
      }
    } catch (e) {
      console.error("[session] confirmation e-mail failed", e);
    }
  }
  return { ok: true, emailed };
}
