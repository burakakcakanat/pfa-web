// Fellow ayrıcalıkları ipucu metni — bedel Fiyat & Oran Merkezi'nden gelir (hardcode yok).
export function fellowHintText(subscriptionUsd?: number | null): string {
  const price =
    subscriptionUsd != null && Number.isFinite(subscriptionUsd)
      ? `$${Math.round(subscriptionUsd)}`
      : "PFA tarafından bildirilen tutar";
  return (
    "PFA Fellow: gelişim programı webinarları dahil · ölçek satış komisyonu %50 " +
    "(Practitioner %25) · 7 ücretsiz danışan daveti (Practitioner 3) · lisans yenilemede " +
    `%50 indirim · rehberde öncelikli sıralama. Yıllık abonelik: ${price}.`
  );
}
