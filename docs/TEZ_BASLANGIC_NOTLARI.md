# Tez Baslangic Notlari

Bu dosya yarin tez metnini yazarken hizli baslangic yapmak icin hazirlandi.

## Onerilen Tez Basligi

PrintForge: AI Destekli 3D Baski Pazaryeri ve Model Uretim Platformu

Alternatif basliklar:

- AI Destekli 3D Model Uretimi ve Satici Pazaryeri Web Platformu
- 3D Baski Sureclerinde Yapay Zeka Destekli Referans Gorsel Tabanli Model Olusturma Sistemi

## Problem Tanimi

3D baski hizmetlerinden yararlanmak isteyen kullanicilarin onunde iki temel engel bulunur. Ilki, kullanicilarin uretime uygun 3D model dosyasina sahip olmamasidir. Ikincisi, uygun satici veya uretici ile iletisim kurma surecinin daginik olmasidir. Kullanici genellikle bir fikir veya gorsel referans ile baslar; ancak bu referansi 3D modele donusturmek, modelin uretilebilirligini degerlendirmek ve saticidan teklif almak teknik bilgi gerektirir.

PrintForge bu problemi, fikir bulma, referans gorsel secme, AI ile model uretme ve satici ile iletisime gecme adimlarini tek web platformunda birlestirerek cozmeyi hedefler.

## Amac

Bu projenin amaci, 3D baski yaptirmak isteyen kullanicilarin teknik modelleme bilgisine ihtiyac duymadan referans gorsel veya metin tabanli prompt ile AI destekli model uretim akisini baslatabilmesini saglamaktir. Ayrica saticilarin hazir urunlerini listeleyebilecegi, kullanicilarin ise urunleri inceleyip mesajlasabilecegi bir pazaryeri deneyimi sunulur.

## Kapsam

Proje kapsaminda:

- Kullanici kayit ve giris sistemi
- Kullanici, satici ve admin rolleri
- Satici urun katalogu
- Admin ornek gorsel yonetimi
- Internet gorsel aramasi ile referans secimi
- AI model olusturma sayfasi
- Prompt otomatik doldurma
- 3D model onizleme
- Mesajlasma ve teklif/siparis sureci

gelistirilmistir.

## Sistem Mimarisi

Sistem frontend ve backend olmak uzere iki ana katmandan olusur.

Frontend:

- Next.js ve React ile gelistirildi.
- Kullanici arayuzu Tailwind CSS ile tasarlandi.
- Ornekler, katalog, AI olusturma, mesajlar ve admin ekranlari bulunur.

Backend:

- Express.js ve TypeScript ile gelistirildi.
- API endpointleri kimlik dogrulama, model, sohbet, ornekler ve gorsel arama olarak ayrildi.
- API anahtarlari backend `.env` dosyasinda tutuldu.
- Prisma ORM ile veritabani islemleri yonetildi.

Dis servisler:

- SerpApi ile internet gorsel aramasi
- AI model uretim servisi
- UploadThing ile dosya/gorsel yukleme

## Veri Akisi: Gorselden AI Uretime

1. Kullanici `/examples` sayfasina gider.
2. Arama bos ise admin tarafindan eklenen ornekler listelenir.
3. Kullanici arama yaptiginda backend `/api/images/search` endpoint'i SerpApi uzerinden gorsel arama yapar.
4. Sonuclar kart olarak gosterilir.
5. Kullanici `AI ile 3D'ye donustur` butonuna tiklar.
6. Secilen gorselin `imageUrl`, `title`, `source` ve arama kelimesi AI sayfasina query parametresi ile aktarilir.
7. AI sayfasinda referans gorsel gosterilir ve prompt otomatik doldurulur.
8. Kullanici promptu duzenleyip model uretimini baslatir.

## Guvenlik ve Dogrulama

- API key ve servis anahtarlari frontend bundle icine konulmadi.
- Gorsel arama backend uzerinden yapildi.
- Arama kelimesi maksimum 80 karakterle sinirlandi.
- Zarali karakterler temizlendi.
- Backend tarafinda Zod ile validation uygulandi.
- CORS izinleri `FRONTEND_URLS` ile kontrol edildi.
- Harici gorseller normal `img` etiketi ve URL kontrolu ile render edildi.

## Performans Yaklasimi

- Arama cubugunda debounce kullanildi.
- Ayni sorgular icin backend tarafinda basit cache uygulandi.
- Frontend tarafinda arama ve admin ornekleri ayri state olarak yonetildi.
- Gorseller lazy-load ile yuklendi.
- Loading skeleton, bos sonuc ve hata ekranlari eklendi.

## Sinirliliklar

- AI model uretimi dis servise baglidir; uretim suresi ve kalite servis yogunluguna gore degisebilir.
- Gorsel arama SerpApi kotasina baglidir.
- Harici gorsellerin telif ve kullanim haklari kullanici tarafindan dikkate alinmalidir.
- Google Custom Search JSON API yeni projelerde erisim kisitlari nedeniyle tercih edilmemistir.

## Gelistirme Onerileri

- Uretilen modeller icin otomatik kalite puanlama
- Satici tekliflerini karsilastirma ekrani
- Model dosyasi icin otomatik maliyet tahmini
- Malzeme, doluluk orani ve teslim suresi secenekleri
- Daha gelismis admin paneli ve icerik moderasyonu
- Kullaniciya ait proje/fikir koleksiyonlari

## Juriye Soylenebilecek Kisa Ozet

"PrintForge, 3D baski yaptirmak isteyen kullanicilarin fikir bulma, referans secme, AI ile model olusturma ve satici ile iletisime gecme sureclerini tek platformda birlestiren bir web uygulamasidir. Projede rol tabanli kullanici sistemi, satici katalogu, admin ornek yonetimi, internet gorsel aramasi, AI model uretim akisi ve mesajlasma modulleri bulunmaktadir."
