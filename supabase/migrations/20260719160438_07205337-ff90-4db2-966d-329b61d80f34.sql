CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts" ON public.blog_posts
  FOR SELECT USING (published = true);
CREATE POLICY "Admins can read all posts" ON public.blog_posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert posts" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update posts" ON public.blog_posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete posts" ON public.blog_posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER blog_posts_set_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.blog_posts (slug, title, seo_description, content, published, sort_order) VALUES
('bilinc-neden-harita', 'Bilinç Neden Bir Haritaya İhtiyaç Duyar?',
 'Kaygının kökeninde çoğu zaman kaybolmuşluk yatar. Bilinç haritası, iç dünyada yön bulmanın neden öğrenilebilir bir beceri olduğunu anlatıyor.',
 'Yabancı bir şehirde, elinizde haritasız dolaştığınızı düşünün. İlk saatler keşif duygusuyla geçebilir; sokaklar ilginç, yüzler yenidir. Ama güneş alçalmaya başladığında bir şey değişir. Sokaklar birbirine benzemeye başlar, her köşe yeni bir belirsizlik üretir ve yürümek keşif olmaktan çıkıp yorgunluğa dönüşür. Aynı meydandan üçüncü kez geçtiğinizi fark ettiğiniz an, yorgunluğun adı değişir: artık kaybolmuşsunuzdur.

İç dünyamızda da benzer bir şey olur. Duygular, düşünceler, güdüler, istekler ve arayışlar arasında dolaşırız; çoğu zaman elimizde bir yön duygusu yoktur. Modern insanın en yaygın şikâyetleri — kaygı, anlamsızlık, tükenmişlik, kararsızlık — çoğu durumda bir hastalığın değil, bir *kaybolmuşluğun* belirtileridir. Nerede olduğunu bilmeyen zihin, kendine özgü bir panik programı çalıştırır: kendini ve çevresini yargılamaya, geleceği felaketleştirmeye, geçmişi tekrar tekrar oynatmaya başlar. Oryantasyonun olmadığı her ortamda kaygı kaçınılmazdır; bu, iradesizlik değil, yönsüz kalmış bir sistemin doğal çıktısıdır.

Bu döngünün panzehiri de bu yüzden daha fazla irade değildir. Kaybolmuş birine "daha çok çabala" demek, haritasız yürüyene "daha hızlı yürü" demeye benzer: hız, yanlış yönde mesafe kazandırır yalnızca. Gereken şey bir haritadır.

## Neden şimdiye kadar bir haritamız olmadı?

İnsanı anlamaya adanmış disiplinlerin her biri kendi bölgesinin ayrıntılı haritasını çıkardı: tıp bedenin, psikoloji zihnin, felsefe anlamın, gelenekler aşkınlığın. Sorun haritaların yokluğu değil, *birleştirilmemiş* olmalarıdır. Duygusal bir sıkışma yaşayan kişi psikoloğun haritasında bir yere, aynı kişinin uyku sorunu doktorun haritasında başka bir yere, anlam arayışı ise bambaşka bir rafın kitaplarına düşer. Kişi tektir; haritalar parçalıdır. Ve parçalı haritalarla yapılan yolculukta en sık yaşanan şey, bir bölgeden diğerine geçerken kaybolmaktır.

Gündelik dilin en kullanışlı iki kelimesi bu boşluğu doldurur: "duygusal" ve "bilinçaltı". Neredeyse her içsel meseleyi bu iki adrese postalarız — ama bu adresler o kadar geniştir ki, gönderilen hiçbir şey yerine ulaşmaz. "Duygusal bir sorun yaşıyorum" cümlesi, "Asya kıtasında bir yerde kayboldum" demeye benzer: doğru ama kullanışsızdır.

## Yedi adresli harita

Psiko-Fonksiyonel Analiz tam bu ihtiyaçtan doğdu. İnsan bilincini tek ve şekilsiz bir bütün olarak değil, yedi işlevsel seviyeden oluşan bağlaşık bir sistem olarak ele alır: hayatta kalma güdülerinden duygulara, akıldan sevgiye, yaratıcılıktan bilgeliğe ve nihayet birlik algısına uzanan bir yolculuk hattı. Her seviyenin bir beyin bölgesi karşılığı, bir zekâ türü ve kendine özgü görev tanımları vardır. Yedi seviye yedi ayrı oda değil, aynı binanın birbirine merdivenlerle bağlı katlarıdır: birinde çıkan yangın diğerlerini dumana boğar, birinde açılan pencere hepsini havalandırır.

Harita metaforunun gücü şuradadır: harita, sorunu ortadan kaldırmaz ama sorunun *adresini* verir. İlişkilerinde tekrarlayan bir duygusal sıkışma yaşayan kişiyi düşünün. Parçalı bakış ona iki seçenek sunar: "karakterin böyle" (değişmez bir kimlik) ya da "bilinçaltında bir şey var" (ulaşılmaz bir mahzen). Haritalı bakış ise üçüncü bir yol açar: mesele ikinci seviyedeki bir işlevin — eski bir bellek kaydının — bugün hâlâ alarm çalmasıdır; üçüncü seviyeden alınacak serinkanlı bir analiz kaydı açabilir, dördüncü seviyeden gelecek anlam onu yeniden yazabilir. Muğlak bir "içsel sorun" yerine, ortada artık üzerinde çalışılabilir bir işlev, başvurulabilir komşu katlar ve izlenebilir bir rota vardır.

Adres bilmenin bir yan etkisi daha vardır: suçluluğun dönüşümü. "Bende bir sorun var" cümlesi kimliğe yapışır ve ağırlaştırır; "şu seviyedeki şu işlev şu anda dengede değil" cümlesi ise kimliği serbest bırakır, işi tarif eder. Aradaki fark, hasta olmakla bakım gerektiren bir eve sahip olmak arasındaki farktır. Ev bakım ister; bu, ev sahibinin kusuru değil, evin doğasıdır.

## Rehberler için de bir harita

Bu bakış yalnızca yolcuyu değil, rehberi de rahatlatır. Terapist, koç, eğitimci ve lider — konusu insan olan herkes — danışanıyla, öğrencisiyle, ekibiyle aynı haritaya bakabildiğinde iki şey birden olur. Birincisi, yolculuğun hangi noktalar arasında yapıldığını iki taraf da bilir; seans ya da görüşme, sisin içinde el yordamıyla ilerlemekten çıkar. İkincisi ve daha önemlisi: yön duygusu ortaya çıktığında, gelişimin sorumluluğu sürdürülebilir biçimde kişinin kendisine geçmeye başlar. Rehberin görevi balık vermek değil, haritayı okumayı öğretmektir — ve haritayı okumayı öğrenen yolcu, rehberine bağımlı kalmaz.

## En uzak durak dahil

Bu haritanın belki en cesur tarafı, geleneksel olarak haritalanamaz sayılan bölgeyi de içermesidir. Aydınlanma, çoğu anlatıda ya mistik bir istisna ya da ulaşılmaz bir mucizedir. PFA''da ise en uzak duraktır — çizginin sonundaki, ama çizginin *üzerindeki* nokta. Uzak olması ulaşılmaz olduğu anlamına gelmez; yalnızca yolun uzunluğunu ve ara durakların sırasını gösterir. Ve haritada yeri olan hiçbir yer, tekinsiz değildir.

Bir yerin haritası varsa, orada kaybolmak bir kader değildir. Bu cümle, bu serinin de pusulası olacak. Önümüzdeki yazılarda haritayı durak durak gezeceğiz: her seviyenin işlevlerini, dengede ve dengesizken nasıl göründüğünü, hangi komşu katlardan destek aldığını tek tek ele alacağız. Yolculuk, her yolculuğun başladığı yerden — hayatta kalmadan — başlıyor.

*Seride sıradaki yazı: "Yedi Seviyede İnsan: PFA''ya Giriş"*', true, 1),
('yedi-seviyede-insan', 'Yedi Seviyede İnsan: PFA''ya Giriş',
 'Psiko-Fonksiyonel Analiz insan bilincini yedi işlevsel seviyeye ayırır. Her seviyenin beyin karşılığını ve zekâ türünü tek yazıda tanıyın.',
 'İçerik yükleniyor.', false, 2),
('l1-beka', 'L1: Beka — Bilincin Temeli',
 'Hayatta kalma seviyesinin işlevleri, dengede ve dengesizken nasıl göründüğü.',
 'İçerik yükleniyor.', false, 3),
('l2-duygular', 'L2: Duygular — Bellek Kayıtlarının Dili',
 'Duygu seviyesinin işlevleri ve bellek kayıtlarının bugüne etkisi.',
 'İçerik yükleniyor.', false, 4);