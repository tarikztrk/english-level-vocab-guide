# Supabase Migration Notları

Bu klasör Supabase tarafında uygulanacak SQL migration dosyalarını içerir.

## Aşama 1

Dosya:

- `supabase/migrations/202607170001_user_progress_auth_rls.sql`

Amaç:

- `user_progress` tablosunu kullanıcı bazlı hâle getirmek.
- Eski public progress read/write policy'lerini kaldırmak.
- Authenticated kullanıcıların sadece kendi progress kayıtlarını okuyup yazmasını sağlamak.
- `user_id + word_id` unique index'i eklemek.
- `updated_at` alanını update sırasında otomatik güncellemek.

## Uygulama

Supabase Dashboard üzerinden:

1. Project → SQL Editor ekranını aç.
2. `supabase/migrations/202607170001_user_progress_auth_rls.sql` içeriğini yapıştır.
3. SQL'i çalıştır.
4. Hata yoksa Authentication ayarlarını Aşama 2 için hazırlamaya geç.

## Önemli Not

Bu migration uygulandıktan sonra mevcut frontend, giriş yapmamış kullanıcı için `user_progress` yazamaz. Bu beklenen davranıştır. Aşama 2 ve Aşama 3'te Auth ve kullanıcı bazlı `saveProgress()` akışı eklenecek.

Güncel durum: Aşama 2 ve Aşama 3 kod tarafında tamamlandı. Giriş yapmış kullanıcıların progress kayıtları `user_id + word_id` üzerinden yazılır. Giriş yapmamış kullanıcılar kelime listesini okuyabilir, fakat progress kaydedemez.

## Doğrulama Sorguları

Migration çalıştıktan sonra SQL Editor'de şu sorgularla durumu kontrol edebilirsin:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_progress'
order by ordinal_position;
```

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'user_progress';
```

```sql
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('words', 'user_progress')
order by tablename, policyname;
```

## Aşama 4: Admin Rolleri

Dosya:

- `supabase/migrations/202608280001_admin_roles.sql`

Amaç:

- `public.profiles` tablosunu oluşturmak (`id`, `email`, `role`).
- Yeni kullanıcı kayıt olduğunda otomatik olarak `role = 'user'` ile bir profil satırı eklemek (trigger).
- Migration öncesi var olan kullanıcılar için profil satırlarını geriye dönük oluşturmak (backfill).
- `profiles` tablosunda RLS açmak: kullanıcı yalnızca kendi profilini okuyabilir, kimse kendi rolünü değiştiremez (insert/update policy'si yok).
- Angular tarafında `/admin/*` route'larını `AdminGuard` ile korumak (`src/app/guards/admin.guard.ts`), `AuthService.isAdmin$` üzerinden kontrol edilir.

## Uygulama

Supabase Dashboard üzerinden:

1. Project → SQL Editor ekranını aç.
2. `supabase/migrations/202608280001_admin_roles.sql` içeriğini yapıştır ve çalıştır.
3. Bir kullanıcıyı admin yapmak için SQL Editor'de:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

## Önemli Not

Bu migration'dan önce `/admin/dashboard`, `/admin/vocabulary` ve `/admin/analytics` route'ları herhangi bir yetki kontrolü olmadan erişilebilirdi. Migration ve `AdminGuard` uygulandıktan sonra bu sayfalara yalnızca `profiles.role = 'admin'` olan, giriş yapmış kullanıcılar erişebilir; diğerleri ana sayfaya yönlendirilir.

## Aşama 5: Admin Analitikleri İçin Tüm Verileri Okuma İzni

Dosya:

- `supabase/migrations/202608280003_admin_read_all.sql`

Amaç:

- Önceki RLS policy'leri her kullanıcının yalnızca kendi `user_progress` satırlarını okumasına izin veriyordu; bu, admin panelindeki "Total Users", "Active Today", "Top Learners" gibi gerçek toplu istatistiklerin hesaplanmasını engelliyordu.
- Bu migration, `profiles` ve `user_progress` tablolarına `public.is_admin()` kontrolüyle admin rolündeki kullanıcılar için "tüm satırları okuma" policy'si ekler.
- Angular tarafında `src/app/services/admin-stats.service.ts` bu verileri okuyup Admin Dashboard ve Admin Analytics ekranlarındaki tüm kartları (Total Users, Active Today, Avg Mastery Rate, Daily/Learner Activity grafiği, CEFR Distribution, Top Learners, Review Queue) gerçek Supabase verisiyle dolduruyor. Önceden bu ekranların çoğu sabit/uydurma (mock) sayılar gösteriyordu.

## Uygulama

`202608280003_admin_read_all.sql` dosyasını da Supabase Dashboard → SQL Editor'de çalıştırman gerekiyor (Aşama 4'teki migration'dan sonra).

## Aşama 6: Başlangıç Kelime Havuzu

Dosya:

- `supabase/migrations/202608280005_seed_vocabulary.sql`

Amaç:

- Her CEFR seviyesi (A1, A2, B1, B2, C1, C2) için 30'ar kelime eklemek — toplam 180 kelime.
- Her kelimede İngilizce kelime, IPA okunuşu, Türkçe anlam, kategori (Akademik/İş/Günlük) ve İngilizce örnek cümle bulunur.
- Migration tekrar çalıştırılsa bile zaten var olan kelimeleri (küçük/büyük harf duyarsız) atlar, yinelenen kayıt oluşturmaz.

## Uygulama

Supabase Dashboard → SQL Editor'de `202608280005_seed_vocabulary.sql` içeriğini çalıştır. Sıra önemli değil, `202608280004_turkish_categories.sql`'den önce veya sonra çalıştırılabilir (bu migration zaten Türkçe kategori adlarıyla ekliyor).

## Aşama 7: Toplu İçerik Üretim Hattı (Admin)

Dosya:

- `supabase/migrations/202609130001_admin_bulk_workflow.sql`

Amaç:

- `words` tablosuna taslak/yayın iş akışı için sütunlar ekler: `status` (`draft`/`published`/`archived`), `word_type` (sıfat/isim/fiil/... — konu bazlı `category`'den ayrı, dilbilgisel tür), `archived_at`, `updated_at` (her güncellemede otomatik yenilenir) ve `updated_by_email`.
- Migration çalıştığında var olan tüm kelimeler `status = 'published'` olarak işaretlenir, yani öğrencilere görünen kelime listesi migration öncesiyle aynı kalır.
- Ekliyor: `word_change_log` tablosu — her oluşturma/düzenleme/yayınlama/arşivleme/geri alma/içe aktarma işlemini kim/ne zaman/ne yaptı olarak kayıt altına alır (sadece admin okuyup yazabilir, kayıtlar silinemez/değiştirilemez).
- Angular tarafında `VocabularyDataService.getWords()` artık yalnızca `status = 'published'` olan kelimeleri döndürür (öğrenci tarafı); `getWordsForAdmin()` tüm durumları döndürür. `AdminVocabularyComponent` bu sütunlar üzerine CSV toplu içe aktarma, taslak/yayın zorunlu alan kontrolü, toplu seçim/eylem, arşivle + "geri al" bildirimi ve satır içi hızlı düzenleme ekler. `/admin/changelog` bu günlüğü listeler.
- `AdminIdleService` admin rotalarında 20 dakika hareketsizlik sonrası otomatik çıkış yapar (oturum zaman aşımı).

## ÖNEMLİ — Uygulama sırası

Bu migration'ı çalıştırmadan yeni frontend kodu deploy edilirse `words.status` ve `words.word_type` sütunları bulunamadığından kelime listesi, bilgi kartları ve admin paneli hata verir. Sırayla:

1. Supabase Dashboard → SQL Editor'de `202609130001_admin_bulk_workflow.sql` içeriğini çalıştır.
2. Ardından yeni frontend kodunu deploy et (veya zaten deploy edilmişse sayfayı yenile).

## Bilinen sınırlama

Admin kelime tablosu hâlâ tüm kayıtları istemciye çekip orada filtreliyor (sunucu tarafında arama/sıralama/sayfalama yok). Kelime sayısı düşükken (şu an ~180-3000 arası) bu bir sorun değil; havuz çok büyürse (`words.select()` tek seferde binlerce satır döndürüyorsa) Supabase `.range()` ve `.ilike()` ile sunucu taraflı sayfalamaya geçmek gerekir — bu, `VocabularyDataService`'in okuma arayüzünü değiştireceği için ayrı bir iş olarak bırakıldı.
