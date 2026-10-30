# Bekleme listesi — imzalı kitap (ödeme öncesi)

## Kararlar
- Kapsam: yalnız kitap (imzalı dijital nüsha, kendine veya hediye). Ölçek/seans/paket listeye girmez.
- İndirim: bekleme listesine kayıtlı kişiye kitapta %10, süresiz.
- Fiyat: ödeme günündeki güncel fiyat − %10 (kilitli fiyat yok).
- Kısa link: `/imzali-kitap` (Instagram bio için), kaynak "instagram" olarak işaretlenir.

## Kullanıcı akışı
1. `/imzali-kitap` (veya /kitaplar'daki "Yakında" yerine gelen "Bekleme listesine katıl · %10") → kitap seçimi (PFA TR/EN, HCD), "hediye" anahtarı (alıcı adı, e-posta, not), imza ithafı adı.
2. Giriş/kayıt zorunlu (mevcut Google + e-posta). Giriş sonrası form kaldığı yerden devam eder.
3. Karşılama ekranı: "Yerinizi ayırdık — ödeme açıldığında kitabınız buraya inecek."
4. /hesabim → "Taleplerim" kartı: kitap, hediye bilgisi, ithaf, durum zaman çizelgesi (Talep alındı → Ödeme açıldı → Ödendi → Kitabınız hazır). İthaf/hediye bilgisi düzenlenebilir, talep iptal edilebilir.
5. Ödeme açıldığında kartta "Şimdi öde" → mevcut checkout, kitap satırına %10 bekleme indirimi otomatik.

## Admin
- Yeni "Bekleme Listesi" sekmesi: kişi, kitap, hediye/alıcı, ithaf, kaynak, tarih, durum; filtre + kitap bazlı sayaç; CSV dışa aktarım.
- "Ödeme açıldı — herkese bildir" düğmesi: mevcut e-posta altyapısıyla tek seferlik bilgilendirme (idempotent).

## Teknik
- Yeni tablo `book_waitlist` (user_id, product_slug, is_gift, recipient_name/email, gift_note, dedication_name, source, status, notified_at, converted_order_id, timestamps) + GRANT + RLS (sahip CRUD kendi satırı, admin tümü).
- İndirim oranı `system_rates`'e `waitlist.kitap_indirim_pct` (=10) olarak eklenir — Fiyat & Oran Merkezi'nden değiştirilebilir.
- Checkout: yalnız kitap satırı fiyatına, kullanıcının aktif waitlist satırı varsa indirim uygular; sipariş metadata'sına `waitlist_id` yazılır. Hak tanımlama, handle_order_paid, hediye/imzalı PDF akışı DEĞİŞMEZ.
- `payments_enabled` kapalıyken kitap düğmeleri bekleme listesine yönlendirir; açıkken kart "Şimdi öde"ye döner.
- Kural testleri: indirim yalnız kitapta, waitlist kaydı yoksa indirim yok, güncel fiyattan hesap.
