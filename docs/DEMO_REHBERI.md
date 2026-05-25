# PrintForge Demo Rehberi

Bu dosya sunum gunu projeyi kontrollu ve kesintisiz gostermek icin hazirlandi.

## Demo Oncesi Kontrol Listesi

- Backend calisiyor: `http://localhost:3001/health`
- Frontend calisiyor: `http://localhost:3000` veya Next.js hangi portu verdiyse o port
- `backend/.env` icinde `SERPAPI_API_KEY` var
- `IMAGE_SEARCH_PROVIDER=serpapi` yazili
- `FRONTEND_URLS` icinde aktif frontend portu var
- En az bir admin ornegi eklenmis
- En az bir kullanici ve bir satici hesabi hazir
- AI uretim servisi calisiyor veya hazir uretilmis model gosterilecek
- Tarayici sekmeleri onceden hazir: ana sayfa, ornekler, AI olustur, katalog, mesajlar

## Onerilen Demo Akisi

### 1. Proje Tanitimi

Kisa cumle:

"PrintForge, 3D baski yaptirmak isteyen kullanicilarin fikir bulmasini, AI ile modele donusturmesini ve saticilarla iletisime gecmesini saglayan bir pazaryeri platformudur."

Vurgulanacak noktalar:

- 3D baski fikri bulma
- AI ile model uretme
- Satici/kullanici/admin rolleri
- Pazaryeri ve mesajlasma

### 2. Ana Sayfa ve Katalog

Gosterilecekler:

- Katalogda satici urunleri
- Urun kartlari ve detay yapisi
- Kullanici tarafindan favori/sepet/mesajlasma akisi varsa kisa gosterim

Anlatim:

"Platform sadece AI uretimi degil, ayni zamanda saticilarin hazir 3D baski urunlerini sergileyebildigi bir pazaryeri olarak tasarlandi."

### 3. Ornekler Sayfasi

Gosterilecekler:

- Admin tarafindan eklenen ornekler
- Arama cubugu
- Populer etiketler
- SerpApi ile gelen gorsel sonuc kartlari
- Tek CTA: `AI ile 3D'ye donustur`

Anlatim:

"Kullanici ister adminin hazirladigi orneklerden, ister internet gorsel aramasindan bir referans secerek AI uretim ekranina geciyor. Burada amac satis karti gostermek degil, AI icin referans secimi yapmak."

### 4. AI Olusturma Sayfasi

Gosterilecekler:

- Secilen gorselin referans olarak gelmesi
- Prompt alaninin otomatik dolmasi
- Kullanici promptu duzenleyebilir
- Model olusturma butonu
- Uretim gecmisi veya tamamlanmis model onizlemesi

Anlatim:

"Gorsel secildiginde sistem otomatik prompt olusturuyor. Kullanici isterse promptu duzenleyip AI model uretimini baslatabiliyor."

### 5. Satici Mesajlasma Akisi

Gosterilecekler:

- Hazir veya uretilmis model uzerinden saticiya mesaj
- Mesajlar ekraninda konusma
- Teklif/siparis takibi

Anlatim:

"AI ile uretilen model sadece ekranda kalmiyor; kullanici uretim icin saticilarla iletisime gecebilir."

### 6. Admin Ornek Yonetimi

Gosterilecekler:

- Admin hesabiyla `/admin/examples`
- Yeni ornek ekleme
- Ornek silme
- Orneklerin `/examples` sayfasinda varsayilan olarak gorunmesi

Anlatim:

"Admin, kullanicilara ilham verecek ornekleri yonetebilir. Bu sayede platformun icerigi canli tutulabilir."

## Riskler ve Yedek Plan

### Gorsel Arama Calismazsa

Soyle:

"Gorsel arama dis API'ye bagli oldugu icin kota veya servis erisimi etkileyebilir. Bu durumda admin ornekleri varsayilan referans kaynagi olarak calismaya devam eder."

Yap:

- Arama cubugunu temizle
- Admin orneklerinden birini sec
- AI sayfasina gec

### AI Uretim Uzun Surerse

Soyle:

"AI model uretimi dis servis ve model karmasikligina gore zaman alabilir. Bu nedenle sistem uretimi arka planda takip edecek sekilde tasarlandi."

Yap:

- Gecmis uretimlerden tamamlanmis bir modeli ac
- Model onizleme alanini goster

### Port Sorunu Olursa

Kontrol:

```bash
netstat -ano | findstr ":3000 :3001 :3002"
```

Kisa cozum:

- Frontend hangi portu verdiyse o adresi ac
- Backend `.env` icindeki `FRONTEND_URLS` listesine o portu ekle
- Backend'i yeniden baslat

### SerpApi Kotasi Biterse

Soyle:

"Arama kotasi dolarsa sistem kullaniciya anlasilir hata mesaji gosterir. Bu durumda admin ornekleriyle akisa devam edilebilir."

## Sunumda Kullanilabilecek Kisa Cevaplar

Soru: "Bu proje neden gerekli?"

Cevap: "3D baski yaptirmak isteyen kullanicilar genellikle teknik model dosyasi hazirlayamaz. PrintForge, fikir bulma, referans secme, AI ile model olusturma ve satici ile iletisime gecme adimlarini tek platformda toplar."

Soru: "AI burada ne ise yariyor?"

Cevap: "AI, metin veya referans gorsel uzerinden 3D baskiya uygun model uretim akisini baslatmak icin kullaniliyor. Sistem kullaniciya otomatik prompt hazirlayarak sureci kolaylastiriyor."

Soru: "Admin ornekleri neden var?"

Cevap: "Dis arama servisleri kota veya kalite degiskenligi yaratabilir. Admin ornekleri hem kontrollu icerik saglar hem de kullaniciya hizli baslangic noktasi verir."

Soru: "Guvenlik icin ne yaptin?"

Cevap: "API anahtarlari frontend'e verilmedi, backend `.env` dosyasinda tutuldu. Gorsel arama backend endpoint'i uzerinden yapiliyor. Arama kelimeleri hem frontend hem backend tarafinda dogrulaniyor ve temizleniyor."

## Demo Suresi Planlama

- Proje tanitimi: 1 dakika
- Katalog ve roller: 2 dakika
- Ornekler ve gorsel arama: 2 dakika
- AI olusturma akisi: 3 dakika
- Mesajlasma/admin: 2 dakika
- Sorular: 3-5 dakika

Toplam ideal demo suresi: 10-15 dakika.
