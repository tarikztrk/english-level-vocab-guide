# English Level Vocab Guide — Geliştirme Planı

Bu planın amacı projeyi mevcut Supabase bağlantılı demo hâlinden, kullanıcı bazlı öğrenme takibi olan kullanılabilir bir kelime öğrenme uygulamasına taşımaktır.

## Mevcut Durum

- Angular 16 uygulaması çalışıyor.
- Supabase client kurulmuş durumda.
- `words` tablosundan kelimeler okunuyor.
- `user_progress` tablosuna `learned` ve `bookmarked` durumları yazılıyor.
- Dashboard, liste görünümü ve flashcard ekranları mevcut.
- Development ve production build başarılı.

## Temel Varsayımlar

- Uygulama ileride birden fazla kullanıcıyı destekleyecek.
- `words` tablosu ortak sözlük verisi olacak.
- `user_progress` her kullanıcının kişisel öğrenme durumunu tutacak.
- Supabase anon key frontend içinde kullanılabilir; güvenlik RLS ile sağlanmalı.

## Aşama 1 — Veri Modelini Sağlamlaştır

Amaç: Progress verisinin tek kullanıcı demosu gibi değil, gerçek kullanıcı bazlı çalışmasını sağlamak.

Durum: SQL migration dosyası hazırlandı. Supabase SQL Editor üzerinde uygulanması gerekiyor.

Migration dosyası:

- `supabase/migrations/202607170001_user_progress_auth_rls.sql`

### Yapılacaklar

- `user_progress` tablosuna `user_id` kolonu ekle.
- `word_id` üzerindeki tekil kısıtı kaldır.
- `user_id + word_id` için unique index oluştur.
- `updated_at` alanını otomatik güncelleyen trigger ekle.
- `words` için public read policy bırak.
- `user_progress` için sadece kendi kullanıcısına read/write policy tanımla.

### Kabul Kriterleri

- Aynı kelime farklı kullanıcılar için farklı `learned/bookmarked` değerleri tutabilir.
- Giriş yapmamış kullanıcı progress yazamaz.
- Giriş yapmış kullanıcı başka kullanıcının progress verisini okuyamaz/güncelleyemez.

## Aşama 2 — Supabase Auth Entegrasyonu

Amaç: Kullanıcı giriş/çıkış akışını uygulamaya eklemek.

Durum: Kod tarafı tamamlandı. Supabase Auth ayarlarında email/password provider'ın açık olduğu doğrulanmalı.

Eklenen dosyalar:

- `src/app/services/auth.service.ts`
- `src/app/components/auth/auth.component.ts`
- `src/app/components/auth/auth.component.html`
- `src/app/components/auth/auth.component.css`

### Yapılacaklar

- `AuthService` oluştur.
- Supabase session durumunu uygulama içinde takip et.
- Email/password login ekranı ekle.
- Signup ekranı veya signup modu ekle.
- Logout aksiyonu ekle.
- Giriş yapılmamış kullanıcı için demo/read-only davranışını netleştir.

### Kabul Kriterleri

- Kullanıcı kayıt olabilir.
- Kullanıcı giriş yapabilir.
- Kullanıcı çıkış yapabilir.
- Refresh sonrası session korunur.
- Progress işlemleri aktif kullanıcıya bağlı çalışır.

## Aşama 3 — Vocabulary Servisini Kullanıcı Bazlı Yap

Amaç: `words` ve aktif kullanıcının `user_progress` verisini doğru birleştirmek.

Durum: Tamamlandı. `VocabularyDataService` auth session hazır olduktan sonra aktif kullanıcıya ait progress kayıtlarını okuyor ve `user_id + word_id` conflict kuralıyla kayıt yazıyor.

### Yapılacaklar

- `VocabularyDataService.getWords()` aktif kullanıcıyı dikkate alacak şekilde güncelle.
- Giriş yoksa sadece `words` verisini varsayılan progress değerleriyle göster.
- `saveProgress()` çağrılarında `user_id` gönder.
- Progress kayıtlarını `user_id + word_id` conflict kuralıyla upsert et.
- Hata durumlarını componentlere daha temiz ilet.

### Kabul Kriterleri

- Giriş yapmış kullanıcı kendi progress durumunu görür.
- Giriş yapmamış kullanıcı kelimeleri görebilir ama progress kaydı yazamaz veya açıkça login’e yönlendirilir.
- `learned` ve `bookmarked` değerleri sayfa yenileme sonrası korunur.

## Aşama 4 — UI Durumlarını İyileştir

Amaç: Uygulamanın veri yükleme ve hata durumlarında kontrollü davranması.

### Yapılacaklar

- Dashboard, list view ve flashcards için loading state ekle.
- Boş veri durumları için kullanıcı mesajı göster.
- Supabase hata durumları için görünür hata mesajı ekle.
- Progress kaydı başarısız olursa UI durumunu geri al.
- Tekrarlanan mapping kodlarını servis veya yardımcı fonksiyona taşı.

### Kabul Kriterleri

- Veri yüklenirken kullanıcı boş ekran görmez.
- Hata olduğunda sadece console error’a düşülmez.
- Progress yazma hatasında kullanıcı yanıltıcı başarılı durum görmez.

## Aşama 5 — Filtreleme ve Dashboard Verilerini Gerçekleştir

Amaç: Statik dashboard değerlerini gerçek veriden hesaplamak.

### Yapılacaklar

- Seviye sekmelerini gerçek filtreye bağla.
- Kategori listesini veriden üret veya merkezi sabite taşı.
- `Overall Mastery` değerini öğrenilen/toplam kelime oranından hesapla.
- `Total` değerini gerçek kelime sayısından hesapla.
- `Today` metriğini şimdilik kaldır veya gerçek aktivite modeline bağla.

### Kabul Kriterleri

- Seviye seçildiğinde liste gerçekten filtrelenir.
- Dashboard istatistikleri Supabase verisiyle tutarlıdır.
- Statik/demo sayılar kalmaz.

## Aşama 6 — Flashcard Öğrenme Akışı

Amaç: Flashcard ekranını sadece gösterim ekranı olmaktan çıkarıp öğrenme aracına dönüştürmek.

### Yapılacaklar

- Flashcard üzerinde `Biliyorum` ve `Tekrar göster` aksiyonları ekle.
- `Biliyorum` aksiyonu `learned=true` yazar.
- `Tekrar göster` aksiyonu `learned=false` veya ileride tekrar planı için ayrı alan kullanır.
- Kategori ve seviye filtresi ekle.
- Boş kart listesi durumunu yönet.

### Kabul Kriterleri

- Flashcard ekranından progress güncellenebilir.
- Kartlar filtreye göre değişir.
- Son karta gelindiğinde davranış net ve hatasızdır.

## Aşama 7 — Kelime Verisini Genişlet

Amaç: Uygulamayı gerçek kullanım için yeterli içerikle beslemek.

### Yapılacaklar

- A1, A2, B1, B2, C1, C2 seviyeleri için veri seti hazırla.
- Her kelimede `word`, `meaning`, `level`, `category`, `example` alanlarını doldur.
- Mümkünse `phonetic` alanlarını tamamla.
- Duplicate kelimeleri engellemek için `lower(word) + level` stratejisi belirle.
- Seed SQL dosyası oluştur.

### Kabul Kriterleri

- Her seviyede yeterli sayıda kelime vardır.
- Eksik zorunlu alan yoktur.
- Seed işlemi tekrar çalıştırıldığında duplicate üretmez.

## Aşama 8 — Telaffuz ve Audio

Amaç: `audio_url` alanını gerçek kullanıcı deneyimine bağlamak.

### Yapılacaklar

- `audio_url` varsa ses oynat.
- `audio_url` yoksa butonu gizle veya disabled göster.
- Audio loading/error durumlarını yönet.
- İleride Supabase Storage veya harici TTS kaynağı seç.

### Kabul Kriterleri

- Ses dosyası varsa kullanıcı telaffuzu dinleyebilir.
- Ses dosyası yoksa uygulama hata vermez.

## Aşama 9 — Test ve Kalite

Amaç: Temel akışların bozulmasını erken yakalamak.

### Yapılacaklar

- `VocabularyDataService` için unit test ekle.
- Auth service için session davranışı test et.
- Componentlerde loading/error state testleri ekle.
- `npm run build` ve production build’i standart doğrulama adımı yap.
- Format/lint komutlarını çalışır hâle getir veya kullanılmayan scriptleri temizle.

### Kabul Kriterleri

- Servis mapping davranışı testlidir.
- Build her aşamada geçer.
- Kritik kullanıcı akışları manuel test listesiyle doğrulanır.

## Aşama 10 — Deployment

Amaç: Uygulamayı canlıya alınabilir duruma getirmek.

### Yapılacaklar

- Supabase production project ayarlarını doğrula.
- Environment değerlerini deployment platformuna göre netleştir.
- Angular production build çıktısını deploy et.
- Supabase URL allowlist/auth redirect ayarlarını yapılandır.
- Basit smoke test listesi oluştur.

### Kabul Kriterleri

- Canlı ortamda kelimeler yüklenir.
- Kullanıcı giriş yapabilir.
- Progress kaydı sayfa yenileme sonrası korunur.
- Console’da kritik hata yoktur.

## Önerilen Çalışma Sırası

1. Aşama 1: Veri modelini kullanıcı bazlı düzelt.
2. Aşama 2: Auth ekle.
3. Aşama 3: Vocabulary servisini auth ile bağla.
4. Aşama 4: UI loading/error durumlarını ekle.
5. Aşama 5: Dashboard ve filtreleri gerçek veriye bağla.
6. Aşama 6: Flashcard öğrenme akışını tamamla.
7. Aşama 7: Kelime veri setini büyüt.
8. Aşama 8: Audio desteğini aktif et.
9. Aşama 9: Test ve kalite kontrollerini ekle.
10. Aşama 10: Deploy et.

## İlk Başlanacak İş

İlk teknik iş `user_progress` tablosunu kullanıcı bazlı hâle getirmektir. Bu yapılmadan Auth eklemek eksik kalır, çünkü mevcut `word_id unique` yapısı tüm kullanıcıların aynı progress kaydını paylaşmasına neden olur.
