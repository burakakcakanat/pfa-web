// Client-safe shared types, labels and validation for purchase (havale) inquiries.
import { z } from "zod";

export type PurchaseInquiryKind =
  | "session"
  | "webinar"
  | "pro_license"
  | "corporate"
  | "assessment"
  | "ebook";
export type PurchaseInquiryStatus = "new" | "contacted" | "paid" | "fulfilled" | "closed";

export const PURCHASE_STATUS_LABEL: Record<PurchaseInquiryStatus, string> = {
  new: "Yeni",
  contacted: "İletişim kuruldu",
  paid: "Ödeme alındı",
  fulfilled: "Hak tanımlandı",
  closed: "Kapatıldı",
};

export const PURCHASE_STATUS_ORDER: PurchaseInquiryStatus[] = [
  "new",
  "contacted",
  "paid",
  "fulfilled",
  "closed",
];

export const PURCHASE_KIND_LABEL: Record<PurchaseInquiryKind, string> = {
  session: "Birebir Seans",
  webinar: "Webinar",
  pro_license: "Uygulayıcı Lisansı",
  corporate: "Kurumsal / Toplu",
  assessment: "Tam PFA Bilinç Seviyeleri Ölçeği",
  ebook: "İmzalı E-Kitap",
};

export const purchaseInquirySchema = z.object({
  kind: z.enum(["session", "webinar", "pro_license", "corporate", "assessment", "ebook"]),
  product_slug: z.string().trim().min(1).max(120),
  product_label: z.string().trim().max(200).optional().default(""),
  full_name: z.string().trim().min(2, { message: "Adınızı yazın." }).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).optional().default(""),
  preferred_slot: z.string().trim().max(400).optional().default(""),
  message: z.string().trim().max(3000).optional().default(""),
  // Optional add-on the requester ticked; validated server-side against bundles.
  addon_bundle_slug: z.string().trim().max(120).nullable().optional(),
  book_lang: z.enum(["tr", "en"]).optional().default("tr"),
  // Origin locale hint from the page; validated server-side, never trusted raw.
  locale: z.enum(["tr", "en"]).optional().default("tr"),
  // Optional badge-tier intent for practitioner license requests — persisted
  // into purchase_inquiries.metadata.badge_intent (admin-rendered only).
  badge_intent: z.enum(["practitioner", "fellow"]).optional(),
  // honeypot — must stay empty
  website_hp: z.string().max(0).optional().default(""),
});
export type PurchaseInquiryInput = z.infer<typeof purchaseInquirySchema>;

/** Admin: what the customer is actually paying for (product or bundle). */
export const fulfilSelectionSchema = z.object({
  id: z.string().uuid(),
  fulfil_kind: z.enum(["product", "bundle"]),
  fulfil_slug: z.string().trim().min(1).max(120),
  fulfil_book_lang: z.enum(["tr", "en"]).optional().default("tr"),
});

export const fulfilInquirySchema = fulfilSelectionSchema.extend({
  /** Skip the customer delivery e-mail (rare; admin choice). */
  notify: z.boolean().optional().default(true),
});

export type GrantedLogEntry = {
  type: string;
  slug: string;
  entitlement_id?: string;
  pending_account?: boolean;
};

export type GrantedLog = {
  at: string;
  selection: { kind: "product" | "bundle"; slug: string; book_lang: "tr" | "en" };
  user_id: string | null;
  email: string;
  entries: GrantedLogEntry[];
  pending_account: boolean;
};

export const purchaseInquiryPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "paid", "fulfilled", "closed"]).optional(),
  admin_note: z.string().max(5000).nullable().optional(),
  // When moving to "paid", optionally send the requester a short confirmation.
  notify: z.boolean().optional(),
});

// Bank details are ADMIN-ONLY. This schema describes the shape only; the values
// never travel to a non-admin client.
export const bankTransferDetailsSchema = z.object({
  account_holder: z.string().trim().max(200).default(""),
  bank_name: z.string().trim().max(200).default(""),
  iban: z.string().trim().max(60).default(""),
  currency: z.string().trim().min(2).max(8).default("TRY"),
  note: z.string().trim().max(500).nullable().optional(),
});
export type BankTransferDetails = z.infer<typeof bankTransferDetailsSchema>;

export const sendTransferInstructionsSchema = z.object({
  id: z.string().uuid(),
  amount: z
    .number({ message: "Tutar girin." })
    .positive({ message: "Tutar sıfırdan büyük olmalı." })
    .max(1_000_000),
  currency: z.string().trim().min(2).max(8).default("TRY"),
});

export function paymentReferenceFor(id: string): string {
  return `PFA-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export type AdminPurchaseInquiryRow = {
  id: string;
  kind: PurchaseInquiryKind;
  product_slug: string;
  product_label: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_slot: string | null;
  message: string | null;
  status: PurchaseInquiryStatus;
  admin_note: string | null;
  locale: "tr" | "en";
  created_at: string;
  updated_at: string;
  payment_reference: string | null;
  transfer_amount: number | null;
  transfer_currency: string | null;
  transfer_sent_at: string | null;
  catalogue_price_cents?: number | null;
  addon_bundle_slug: string | null;
  fulfil_kind: "product" | "bundle" | null;
  fulfil_slug: string | null;
  fulfil_book_lang: "tr" | "en";
  granted: GrantedLog | null;
  fulfilled_at: string | null;
  metadata: { badge_intent?: "practitioner" | "fellow" } | null;
  /** Resolved price of the current fulfilment selection, in cents. */
  selection_price_cents?: number | null;
};