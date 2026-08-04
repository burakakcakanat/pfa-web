import { z, ZodError, type ZodIssue } from "zod";

const FIELD_LABELS: Record<string, string> = {
  full_name: "Ad Soyad",
  email: "E-posta",
  subject: "Konu",
  message: "Mesaj",
  sender_name: "Adınız",
  sender_email: "E-posta",
  motivation: "Motivasyon yazısı",
  phone: "Telefon",
  city: "Şehir",
  title: "Başlık",
  content_md: "İçerik",
  segment: "Segment",
  category: "Kategori",
  profession_title: "Meslek",
  experience_years: "Deneyim (yıl)",
  kvkk_accepted: "KVKK onayı",
  cv_path: "Özgeçmiş",
  diploma_path: "Diploma / sertifika",
};

function labelFor(path: readonly PropertyKey[]): string {
  const key = String(path[path.length - 1] ?? "");
  return FIELD_LABELS[key] || "Alan";
}

function toFriendlyMessage(issue: ZodIssue): string {
  const label = labelFor(issue.path);
  const code = issue.code;
  const anyIssue = issue as unknown as Record<string, unknown>;

  if (code === "invalid_type") {
    if (anyIssue.received === "undefined" || anyIssue.received === "null") {
      return `${label} boş bırakılamaz.`;
    }
    return `${label} geçersiz.`;
  }
  if (code === "too_small") {
    const min = Number(anyIssue.minimum ?? 0);
    const type = String(anyIssue.type ?? "");
    if (type === "string") {
      if (min <= 1) return `${label} boş bırakılamaz.`;
      return `${label} en az ${min} karakter olmalı.`;
    }
    return `${label} en az ${min} olmalı.`;
  }
  if (code === "too_big") {
    const max = Number(anyIssue.maximum ?? 0);
    const type = String(anyIssue.type ?? "");
    if (type === "string") return `${label} en fazla ${max} karakter olabilir.`;
    return `${label} en fazla ${max} olabilir.`;
  }
  if (code === "invalid_format") {
    const v = String(anyIssue.format ?? anyIssue.validation ?? "");
    if (v === "email") return "Geçerli bir e-posta adresi girin.";
    if (v === "url") return "Geçerli bir bağlantı girin.";
    if (v === "uuid") return "Geçersiz kimlik.";
    return `${label} geçersiz.`;
  }
  if (code === "invalid_value") return `${label} için geçerli bir değer seçin.`;
  if (code === "custom" && typeof issue.message === "string") return issue.message;
  return `${label} geçersiz.`;
}

export function parseFriendly<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError && e.issues.length > 0) {
      throw new Error(toFriendlyMessage(e.issues[0]));
    }
    throw e;
  }
}

const FIELD_LABELS_EN: Record<string, string> = {
  full_name: "Full name",
  email: "Email",
  subject: "Subject",
  message: "Message",
  sender_name: "Your name",
  sender_email: "Email",
  motivation: "Motivation letter",
  phone: "Phone",
  city: "City",
  title: "Title",
  content_md: "Content",
};

function toFriendlyMessageEn(issue: ZodIssue): string {
  const key = String(issue.path[issue.path.length - 1] ?? "");
  const label = FIELD_LABELS_EN[key] || "This field";
  const anyIssue = issue as unknown as Record<string, unknown>;
  const code = issue.code;

  if (code === "invalid_type") {
    if (anyIssue.received === "undefined" || anyIssue.received === "null") {
      return `${label} cannot be empty.`;
    }
    return `${label} is invalid.`;
  }
  if (code === "too_small") {
    const min = Number(anyIssue.minimum ?? 0);
    if (String(anyIssue.type ?? "") === "string") {
      return min <= 1
        ? `${label} cannot be empty.`
        : `${label} must be at least ${min} characters.`;
    }
    return `${label} must be at least ${min}.`;
  }
  if (code === "too_big") {
    const max = Number(anyIssue.maximum ?? 0);
    if (String(anyIssue.type ?? "") === "string") {
      return `${label} can be at most ${max} characters.`;
    }
    return `${label} can be at most ${max}.`;
  }
  if (code === "invalid_format") {
    const v = String(anyIssue.format ?? anyIssue.validation ?? "");
    if (v === "email") return "Please enter a valid email address.";
    if (v === "url") return "Please enter a valid link.";
    return `${label} is invalid.`;
  }
  if (code === "invalid_value") return `Please choose a valid value for ${label.toLowerCase()}.`;
  if (code === "custom" && typeof issue.message === "string") return issue.message;
  return `${label} is invalid.`;
}

/** Same as parseFriendly, with British English messages for the /en surfaces. */
export function parseFriendlyEn<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError && e.issues.length > 0) {
      throw new Error(toFriendlyMessageEn(e.issues[0]));
    }
    throw e;
  }
}