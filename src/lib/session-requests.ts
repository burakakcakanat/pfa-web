// Client-safe types/labels for session credits and session requests.
//
// FUTURE (practitioner selection): session_requests.practitioner_id already
// exists and stays NULL for the owner's own calendar. When practitioners are
// bookable the picker passes the chosen practitioner and availability is
// filtered by it — no migration needed.

export type SessionRequestStatus = "pending" | "confirmed" | "completed" | "cancelled";

export const SESSION_STATUS_LABEL_TR: Record<SessionRequestStatus, string> = {
  pending: "Teyit bekleniyor",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export const SESSION_STATUS_ORDER: SessionRequestStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export type SessionRequestRow = {
  id: string;
  status: SessionRequestStatus;
  preferred_slot: string;
  confirmed_at: string | null;
  admin_note: string | null;
  created_at: string;
  practitioner_id: string | null;
};

export type MySessionsView = {
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  requests: SessionRequestRow[];
};

export type AdminSessionRequestRow = SessionRequestRow & {
  user_id: string;
  full_name: string | null;
  email: string | null;
};
