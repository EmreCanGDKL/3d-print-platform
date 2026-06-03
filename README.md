# PrintForge

PrintForge, 3D baski fikirlerini AI destekli model uretim akisina ve satici odakli pazaryeri surecine baglayan bir web platformudur. Projede kullanici, satici ve admin rolleri bulunur; kullanicilar hazir orneklerden veya gorsel arama sonuclarindan referans secerek AI model olusturma sayfasina gecis yapabilir.

## Temel Ozellikler

- Kullanici, satici ve admin rolleri
- Satici urun katalogu ve urun detay akisi
- Admin tarafindan yonetilen ornek gorseller
- SerpApi destekli internet gorsel aramasi
- Secilen gorseli AI model olusturma sayfasina referans olarak aktarma
- Prompt otomatik doldurma ve kullanici tarafindan duzenleme
- AI model uretim gecmisi ve 3D model onizleme
- Satici ile mesajlasma ve teklif/siparis sureci

## Teknolojiler

- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Veritabani: Prisma ORM
- 3D gorsellestirme: Three.js
- Gorsel arama: SerpApi Google Images
- Dosya/gorsel yukleme: UploadThing

## Kurulum

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Varsayilan adresler:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

Eger `3000` doluysa Next.js otomatik olarak `3002` gibi baska bir porta gecebilir. Bu durumda backend `.env` dosyasinda `FRONTEND_URLS` icine bu adresi de eklemek gerekir.

## Canli Ortam Notu

Netlify sadece frontend'i yayinlar. Backend ayri bir web service olarak calisir. Bu nedenle ortam degiskenleri iki farkli panele yazilir:

Frontend hosting ortam degiskenleri:

```env
NEXT_PUBLIC_BACKEND_URL="https://backend-domaininiz.com"
```

Backend hosting ortam degiskenleri:

```env
FRONTEND_URLS="https://netlify-domaininiz.netlify.app"
IMAGE_SEARCH_PROVIDER="serpapi"
SERPAPI_API_KEY="serpapi_key"
```

Canli ortamda `localhost` adresleri kullanilmaz. `NEXT_PUBLIC_BACKEND_URL` yanlislikla `http://localhost:3001` kalirsa Netlify'daki site kullanicinin kendi bilgisayarindaki backend'e istek atmaya calisir.

## Backend Ortam Degiskenleri

`backend/.env` icin temel ornek:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="uzun-ve-gizli-bir-deger"
JWT_EXPIRES_IN="7d"
FRONTEND_URLS="http://localhost:3000,http://localhost:3002"

IMAGE_SEARCH_PROVIDER="serpapi"
SERPAPI_API_KEY="serpapi_key"

TRIPO_API_KEY=""
HITEM3D_ACCESS_KEY=""
HITEM3D_SECRET_KEY=""
HITEM3D_RESOLUTION="512"
HITEM3D_FACE_COUNT="800000"
HITEM3D_MODEL="hitem3dv1.5"
```

Google Custom Search JSON API yeni projelerde erisim sorunu cikarabildigi icin gorsel arama akisi SerpApi ile calisacak sekilde hazirlanmistir.

## Test ve Dogrulama

Backend build:

```bash
cd backend
npm run build
```

Frontend build:

```bash
cd frontend
npm run build
```

Hizli manuel test:

1. Backend ve frontend'i baslat.
2. `/examples` sayfasina git.
3. `vazo`, `figür` veya `cosplay kaskı` aramasi yap.
4. Bir karttan `AI ile 3D'ye donustur` butonuna tikla.
5. `/ai-create` uzerinden AI olusturma ekranina yonlendigini, referans gorsel ve promptun geldigini kontrol et.

## Demo Notu

Sunumda dis servislerin kota veya gecikme riski oldugu unutulmamali. Demo oncesi SerpApi kotasi, AI uretim servisi ve backend/frontend portlari kontrol edilmelidir. Ayrintili akis icin [docs/DEMO_REHBERI.md](docs/DEMO_REHBERI.md) dosyasina bak.
