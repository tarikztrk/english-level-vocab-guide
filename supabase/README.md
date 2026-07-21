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
