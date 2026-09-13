# EnglishAcademy

CEFR seviyelerine göre İngilizce kelime öğrenme uygulaması. Angular 16 + Supabase ile geliştirilmiştir. Arayüz tamamen Türkçedir.

**Canlı adres:** https://tarikztrk.github.io/english-level-vocab-guide/

## Özellikler

- **Ana Sayfa** — CEFR seviyesi ve kategoriye göre filtreleme, toplu "öğrenildi" işaretleme, günün kelimesi.
- **Kelime Listesi** — arama, sıralama, kaydedilenler filtresi ve CSV dışa aktarma.
- **Bilgi Kartları** — çevrilebilir kartlar, telaffuz dinleme, ilerleme takibi.
- **Telaffuz** — kelimenin ses dosyası varsa o çalınır, yoksa tarayıcının konuşma sentezi (Web Speech API) kullanılır.
- **Yönetim Paneli** — kelime ekleme/düzenleme/silme, CSV toplu içe aktarma (sütun eşleme + yinelenen tespiti), taslak/yayın iş akışı, toplu seviye/yayınla/arşivle işlemleri, arşivden "geri al" bildirimi, değişiklik günlüğü ve gerçek Supabase verisine dayalı kullanıcı analizleri. Yalnızca `profiles.role = 'admin'` olan kullanıcılar erişebilir; 20 dakika hareketsizlikte oturum otomatik kapanır.

## Kurulum

```bash
npm install
npm start
```

Supabase bağlantı bilgileri `src/environments/environment.ts` içindedir.

## Veritabanı

Migration dosyaları `supabase/migrations/` altındadır ve Supabase Dashboard → SQL Editor üzerinden sırayla çalıştırılır. Ayrıntılar ve doğrulama sorguları için `supabase/README.md` dosyasına bakın.

Bir kullanıcıyı yönetici yapmak için:

```sql
update public.profiles set role = 'admin' where email = 'ornek@eposta.com';
```

## Yayınlama

`main` branch'ine yapılan her push, `.github/workflows/deploy.yml` içindeki GitHub Actions workflow'unu tetikleyerek uygulamayı otomatik olarak GitHub Pages'e dağıtır. İlk kurulumda repo ayarlarında **Settings → Pages → Source: "GitHub Actions"** seçilmesi gerekir. URL'ler hash tabanlıdır (ör. `/#/list`), bu sayede derin linklerde veya sayfa yenilemede 404 hatası oluşmaz.

## Tasarım

`stitch_exports/` klasörü Google Stitch'ten alınan ekran tasarımlarını içerir; arayüz bileşenleri bu tasarımlara dayanır.
