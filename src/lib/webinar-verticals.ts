// Webinar "Hedef Dikey" seçenekleri — oturum bazında saklanır
// (webinar_sessions.target_vertical), çünkü aynı ürün farklı dikeylere
// hitap eden oturumlar barındırabilir.
export const WEBINAR_VERTICALS = [
  { value: "genel", label: "Genel katılım" },
  { value: "uygulayici", label: "PFA uygulayıcılarına özel" },
  { value: "kurumsal", label: "Kurumsal gelişim · Liderler · İK · Koçlar" },
  { value: "terapotik", label: "Terapötik alan" },
  { value: "pedagoji", label: "Pedagoji profesyonelleri" },
] as const;

export function verticalLabel(value?: string | null): string | null {
  if (!value) return null;
  return WEBINAR_VERTICALS.find((v) => v.value === value)?.label ?? value;
}
