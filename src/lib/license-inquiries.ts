// Client-safe shared types, labels and validation schemas for license inquiries.
import { z } from "zod";

export type LicenseType = "ulke" | "kurumsal";
export type LicenseStatus = "yeni" | "incelemede" | "gorusme" | "kabul" | "red";

export const LICENSE_STATUS_LABEL: Record<LicenseStatus, string> = {
  yeni: "Yeni",
  incelemede: "İncelemede",
  gorusme: "Görüşme",
  kabul: "Kabul",
  red: "Red",
};

export const LICENSE_TYPE_LABEL: Record<LicenseType, string> = {
  ulke: "Ülke / Bölge Lisansı",
  kurumsal: "Kurumsal Lisans",
};

const optText = (max: number) => z.string().trim().max(max).optional().default("");

const baseSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(200),
  phone: optText(60),
  organisation: optText(200),
  country: optText(120),
  city: optText(120),
  website: optText(300),
  role: optText(200),
  message: z.string().trim().min(30).max(4000),
  consent: z.literal(true),
  expected_timeline: optText(200),
  // honeypot — must stay empty
  website_hp: z.string().max(0).optional().default(""),
});

const ulkeSchema = baseSchema.extend({
  type: z.literal("ulke"),
  target_territory: z.string().trim().min(2).max(200),
  existing_business_area: optText(400),
  team_size: z.coerce.number().int().min(0).max(100000).optional(),
  years_in_field: z.coerce.number().int().min(0).max(80).optional(),
  why_pfa: z.string().trim().min(30).max(3000),
  gtm_approach: optText(3000),
});

const kurumsalSchema = baseSchema.extend({
  type: z.literal("kurumsal"),
  institution_type: z.string().trim().min(2).max(200),
  current_programmes: optText(3000),
  annual_trainee_volume: z.coerce.number().int().min(0).max(10000000).optional(),
  trainer_count: z.coerce.number().int().min(0).max(100000).optional(),
  intended_use: z.string().trim().min(30).max(3000),
});

export const licenseInquirySchema = z.discriminatedUnion("type", [ulkeSchema, kurumsalSchema]);
export type LicenseInquiryInput = z.infer<typeof licenseInquirySchema>;

export const licenseAdminPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["yeni", "incelemede", "gorusme", "kabul", "red"]).optional(),
  admin_note: z.string().max(5000).nullable().optional(),
});

export type AdminLicenseInquiryRow = {
  id: string;
  type: LicenseType;
  full_name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  role: string | null;
  message: string;
  consent: boolean;
  status: LicenseStatus;
  admin_note: string | null;
  target_territory: string | null;
  existing_business_area: string | null;
  team_size: number | null;
  years_in_field: number | null;
  why_pfa: string | null;
  gtm_approach: string | null;
  institution_type: string | null;
  current_programmes: string | null;
  annual_trainee_volume: number | null;
  trainer_count: number | null;
  intended_use: string | null;
  expected_timeline: string | null;
  created_at: string;
};
