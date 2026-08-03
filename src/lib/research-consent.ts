import { z } from "zod";

/** Current research-consent document version (see public.research_consent_versions). */
export const RESEARCH_CONSENT_VERSION = "v1";

export const AGE_BANDS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
  "belirtmek-istemiyorum",
] as const;

export const GENDERS = ["kadin", "erkek", "diger", "belirtmek-istemiyorum"] as const;

export const EDUCATION_LEVELS = [
  "lise-alti",
  "lise",
  "on-lisans",
  "lisans",
  "yuksek-lisans",
  "doktora",
  "belirtmek-istemiyorum",
] as const;

export const OCCUPATION_FIELDS = [
  "saglik",
  "egitim",
  "muhendislik-teknoloji",
  "isletme-finans",
  "hukuk",
  "sanat-medya",
  "kamu",
  "ogrenci",
  "emekli",
  "diger",
  "belirtmek-istemiyorum",
] as const;

export const AGE_BAND_LABEL: Record<string, string> = {
  "18-24": "18–24",
  "25-34": "25–34",
  "35-44": "35–44",
  "45-54": "45–54",
  "55-64": "55–64",
  "65+": "65 ve üzeri",
  "belirtmek-istemiyorum": "Belirtmek istemiyorum",
};

export const GENDER_LABEL: Record<string, string> = {
  kadin: "Kadın",
  erkek: "Erkek",
  diger: "Diğer",
  "belirtmek-istemiyorum": "Belirtmek istemiyorum",
};

export const EDUCATION_LABEL: Record<string, string> = {
  "lise-alti": "Lise altı",
  lise: "Lise",
  "on-lisans": "Ön lisans",
  lisans: "Lisans",
  "yuksek-lisans": "Yüksek lisans",
  doktora: "Doktora",
  "belirtmek-istemiyorum": "Belirtmek istemiyorum",
};

export const OCCUPATION_LABEL: Record<string, string> = {
  saglik: "Sağlık",
  egitim: "Eğitim",
  "muhendislik-teknoloji": "Mühendislik / Teknoloji",
  "isletme-finans": "İşletme / Finans",
  hukuk: "Hukuk",
  "sanat-medya": "Sanat / Medya",
  kamu: "Kamu",
  ogrenci: "Öğrenci",
  emekli: "Emekli",
  diger: "Diğer",
  "belirtmek-istemiyorum": "Belirtmek istemiyorum",
};

export const DemographicsSchema = z.object({
  age_band: z.enum(AGE_BANDS).nullish(),
  gender: z.enum(GENDERS).nullish(),
  education: z.enum(EDUCATION_LEVELS).nullish(),
  occupation_field: z.enum(OCCUPATION_FIELDS).nullish(),
});

export type Demographics = z.infer<typeof DemographicsSchema>;

/** Consent payload carried by an instrument submission. Default is always NO. */
export const ResearchConsentSchema = z.object({
  research_consent: z.boolean().default(false),
  consent_version: z.string().max(40).default(RESEARCH_CONSENT_VERSION),
  demographics: DemographicsSchema.nullish(),
});

export type ResearchConsentInput = z.infer<typeof ResearchConsentSchema>;

export const EMPTY_CONSENT: ResearchConsentInput = {
  research_consent: false,
  consent_version: RESEARCH_CONSENT_VERSION,
  demographics: {},
};

export function hasAnyDemographics(d: Demographics | null | undefined): boolean {
  if (!d) return false;
  return Boolean(d.age_band || d.gender || d.education || d.occupation_field);
}