# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_thesis as bt  # noqa: E402


WORKSPACE = Path(__file__).resolve().parents[1]
OUT_PATH = WORKSPACE / "PrintForge_Bitirme_Tezi_40_50_Sayfa.docx"
SCREENSHOT_DIR = WORKSPACE / "thesis_work" / "site_screenshots"


PAGE_MAP = {
    "ozet": "v",
    "abstract": "vi",
    "onsoz": "vii",
    "kisaltmalar": "ix",
    "tablolar": "x",
    "sekiller": "xi",
    "ekler_listesi": "xii",
    "giris": "1",
    "ch1": "3",
    "s11": "3",
    "s12": "5",
    "s13": "7",
    "s14": "9",
    "s15": "11",
    "ch2": "13",
    "s21": "13",
    "s22": "15",
    "s23": "17",
    "s24": "19",
    "s25": "21",
    "s26": "23",
    "s27": "25",
    "s28": "32",
    "ch3": "34",
    "s31": "34",
    "s32": "36",
    "s33": "45",
    "s34": "46",
    "s35": "47",
    "s36": "48",
    "sonuc": "49",
    "kaynakca": "50",
    "ekler": "50",
    "ozgecmis": "50",
    "tab_1_1": "11",
    "tab_2_1": "14",
    "tab_2_2": "16",
    "tab_2_3": "18",
    "tab_2_4": "22",
    "tab_2_5": "31",
    "tab_2_6": "33",
    "tab_3_1": "35",
    "tab_3_2": "46",
    "tab_3_3": "47",
    "fig_1_1": "6",
    "fig_2_1": "15",
    "fig_2_2": "16",
    "fig_2_3": "18",
    "fig_2_4": "23",
    "fig_3_1": "35",
    "fig_3_2": "36",
    "fig_3_3": "37",
    "fig_3_4": "38",
    "fig_3_5": "39",
    "fig_3_6": "40",
    "fig_3_7": "41",
    "fig_3_8": "42",
    "fig_3_9": "43",
    "fig_3_10": "44",
    "fig_3_11": "44",
    "fig_3_12": "45",
    "app_a": "50",
    "app_b": "50",
    "app_c": "50",
    "app_d": "50",
}


def configure_lists() -> None:
    bt.DOCX_PATH = OUT_PATH
    bt.TOC_ENTRIES = [
        ("ÖZET", "ozet", 0),
        ("ABSTRACT", "abstract", 0),
        ("ÖNSÖZ", "onsoz", 0),
        ("KISALTMALAR", "kisaltmalar", 0),
        ("TABLOLAR LİSTESİ", "tablolar", 0),
        ("ŞEKİLLER LİSTESİ", "sekiller", 0),
        ("EKLER LİSTESİ", "ekler_listesi", 0),
        ("GİRİŞ", "giris", 0),
        ("BİRİNCİ BÖLÜM TEORİK ALT YAPI", "ch1", 0),
        ("1.1. Eklemeli İmalat ve 3D Baskı", "s11", 1),
        ("1.2. AI Destekli 3D Model Üretimi", "s12", 1),
        ("1.3. Web Tabanlı Pazaryeri Yaklaşımı", "s13", 1),
        ("1.4. Yazılım Mimarisi, Güvenlik ve Veri Yönetimi", "s14", 1),
        ("1.5. Literatür Değerlendirmesi ve Özgün Değer", "s15", 1),
        ("İKİNCİ BÖLÜM MATERYAL VE METOT", "ch2", 0),
        ("2.1. Kullanılan Materyaller ve Yazılım Araçları", "s21", 1),
        ("2.2. Sistem Mimarisi", "s22", 1),
        ("2.3. Veri Modeli ve Veritabanı Tasarımı", "s23", 1),
        ("2.4. Uygulama Geliştirme Süreci", "s24", 1),
        ("2.5. Yapılan Testler", "s25", 1),
        ("2.6. Güvenlik, Etik Standartlar ve Varsayımlar", "s26", 1),
        ("2.7. Ayrıntılı Modül Tasarımı", "s27", 1),
        ("2.8. İş Paketleri ve Zaman Yönetimi", "s28", 1),
        ("ÜÇÜNCÜ BÖLÜM BULGULAR VE TARTIŞMA", "ch3", 0),
        ("3.1. Gerçekleştirilen Modüller", "s31", 1),
        ("3.2. Arayüz ve Kullanıcı Akışı Bulguları", "s32", 1),
        ("3.3. Derleme ve Teknik Doğrulama Bulguları", "s33", 1),
        ("3.4. Kullanıcı Akışlarına İlişkin Bulgular", "s34", 1),
        ("3.5. Güvenlik, Sınırlılıklar ve Geliştirme Önerileri", "s35", 1),
        ("3.6. Tartışma", "s36", 1),
        ("SONUÇ VE ÖNERİLER", "sonuc", 0),
        ("KAYNAKÇA", "kaynakca", 0),
        ("EKLER", "ekler", 0),
        ("ÖZGEÇMİŞ", "ozgecmis", 0),
    ]
    bt.TABLES = [
        ("Tablo 1.1. Literatür çalışmaları ve PrintForge ile ilişkisi", "tab_1_1"),
        ("Tablo 2.1. Projede kullanılan yazılım bileşenleri", "tab_2_1"),
        ("Tablo 2.2. Backend API modülleri ve görevleri", "tab_2_2"),
        ("Tablo 2.3. Temel veritabanı varlıkları", "tab_2_3"),
        ("Tablo 2.4. Test senaryoları ve kabul ölçütleri", "tab_2_4"),
        ("Tablo 2.5. Ayrıntılı mimari katmanlar ve kontrol noktaları", "tab_2_5"),
        ("Tablo 2.6. İş paketleri ve çıktıları", "tab_2_6"),
        ("Tablo 3.1. Derleme doğrulama sonuçları", "tab_3_1"),
        ("Tablo 3.2. Gerçekleştirilen kullanıcı akışları", "tab_3_2"),
        ("Tablo 3.3. Sınırlılıklar ve geliştirme önerileri", "tab_3_3"),
    ]
    bt.FIGURES = [
        ("Şekil 1.1. Literatürden projeye uzanan kavramsal konumlandırma", "fig_1_1"),
        ("Şekil 2.1. PrintForge sistem mimarisi", "fig_2_1"),
        ("Şekil 2.2. Referans görselden AI üretime veri akışı", "fig_2_2"),
        ("Şekil 2.3. Veri modeli ilişkileri", "fig_2_3"),
        ("Şekil 2.4. Kimlik doğrulama ve güvenli erişim akışı", "fig_2_4"),
        ("Şekil 3.1. Modül tamamlama durumu", "fig_3_1"),
        ("Şekil 3.2. Ana sayfa ve değer önerisi ekranı", "fig_3_2"),
        ("Şekil 3.3. Katalog ve filtreleme ekranı", "fig_3_3"),
        ("Şekil 3.4. Örnek görsel arama ekranı", "fig_3_4"),
        ("Şekil 3.5. AI model üretim ekranı", "fig_3_5"),
        ("Şekil 3.6. Giriş ekranı", "fig_3_6"),
        ("Şekil 3.7. Satıcı ürün yönetimi ekranı", "fig_3_7"),
        ("Şekil 3.8. Satıcı ürün ekleme ekranı", "fig_3_8"),
        ("Şekil 3.9. Favoriler ekranı", "fig_3_9"),
        ("Şekil 3.10. Mesajlar ekranı", "fig_3_10"),
        ("Şekil 3.11. Sipariş takip ekranı", "fig_3_11"),
        ("Şekil 3.12. Derleme ve doğrulama özeti", "fig_3_12"),
    ]
    bt.APPENDICES = [
        ("Ek A. Kurulum ve çalıştırma adımları", "app_a"),
        ("Ek B. Backend ortam değişkenleri", "app_b"),
        ("Ek C. API uç noktaları özeti", "app_c"),
        ("Ek D. Manuel test kontrol listesi", "app_d"),
    ]


def add_screen_figure(doc: Document, filename: str, caption: str, note: str, finding: str) -> None:
    path = SCREENSHOT_DIR / filename
    bt.add_para(doc, note)
    bt.add_figure(doc, path, caption, 12.8)
    bt.add_para(
        doc,
        "Kaynak: PrintForge uygulamasından alınan ekran görüntüsü, 06.06.2026.",
        "TezSource",
    )
    bt.add_para(doc, finding)


def add_extended_technical_design_compact(doc: Document) -> None:
    bt.add_section_heading(doc, "2.7. Ayrıntılı Modül Tasarımı")
    bt.add_para(
        doc,
        "Bu alt bölüm, PrintForge uygulamasının yalnızca hangi teknolojilerle geliştirildiğini değil, modüllerin hangi sorumluluklarla ayrıldığını ve bu ayrımın neden tercih edildiğini açıklamak amacıyla hazırlanmıştır. Projede her ekran bağımsız bir sayfa olarak değil, fikir seçimi, AI üretimi, katalog inceleme, satıcıyla iletişim ve sipariş takibi zincirinin bir parçası olarak ele alınmıştır. Bu nedenle modül tasarımında kullanıcı deneyimi, veri modeli, güvenlik ve sürdürülebilirlik kararları birlikte değerlendirilmiştir.",
    )
    bt.add_para(
        doc,
        "Modül ayrımı yapılırken iki temel ölçüt kullanılmıştır. İlk ölçüt, kullanıcının ekranda tamamladığı görevin sınırıdır; örneğin örnek görsel arama, AI model üretme, katalog ürünü inceleme veya satıcıya mesaj gönderme ayrı kullanıcı niyetleridir. İkinci ölçüt ise backend tarafında yürütülen iş kuralıdır; kimlik doğrulama, görsel arama, model dosyası erişimi ve mesajlaşma gibi işlemler ayrı rota dosyaları ve doğrulama adımlarıyla yönetilmiştir. Bu yaklaşım kodun okunabilirliğini artırmış, hata ayıklama ve geliştirme sürecini daha kontrollü hale getirmiştir.",
    )
    sections = [
        (
            "2.7.1. Frontend Sayfa Yapısı ve Kullanıcı Deneyimi",
            [
                "Frontend katmanında ana sayfa, örnekler, AI üretim stüdyosu, pazaryeri, sepet, favoriler, mesajlar, siparişler, satıcı ürün paneli ve admin örnek yönetimi gibi sayfalar bulunmaktadır. Bu sayfaların her biri farklı kullanıcı rolünün bir görevi tamamlamasına hizmet eder. Kullanıcı için en kritik akış örnek görselden AI üretim sayfasına geçiştir; satıcı için ürün ekleme ve gelen mesaj/sipariş takibidir; admin için ise platformdaki referans içeriklerinin düzenli tutulmasıdır.",
                "Arayüz tasarımında rol tabanlı görünürlük tercih edilmiştir. Satıcı hesabı ürün ekleme ve ürün yönetme bağlantılarını görürken, normal kullanıcı katalog inceleme, AI üretim ve satıcıya ulaşma akışlarına yönlendirilir. Bu yaklaşım kullanıcıyı ilgisiz kontrollerle karşılaştırmadığı için hata olasılığını azaltır ve arayüzü daha anlaşılır hale getirir.",
            ],
        ),
        (
            "2.7.2. Örnek Görsel ve Prompt Aktarım Mekanizması",
            [
                "Örnekler sayfasında iki farklı referans kaynağı vardır: admin tarafından yönetilen kontrollü örnekler ve internet görsel arama sonuçları. Kontrollü örnekler, dış servis kotası veya arama kalitesi sorunlarında sistemin temel akışını sürdürebilmesini sağlar. İnternet araması ise kullanıcının daha geniş fikir havuzuna ulaşmasına yardımcı olur.",
                "Kullanıcı bir görsel kartını seçtiğinde yalnızca görsel URL'si aktarılmaz; başlık, kaynak, arama kelimesi ve oluşturulan prompt da query parametreleriyle AI üretim sayfasına taşınır. Bu karar, kullanıcının boş bir prompt alanıyla karşılaşmasını önler ve referans görselin üretim bağlamını korur.",
            ],
        ),
        (
            "2.7.3. AI Üretim Görevi ve Durum İzleme",
            [
                "AI üretim servisleri genellikle anlık sonuç döndürmek yerine görev tabanlı çalışır. Bu nedenle PrintForge, model üretimini tek istek-tek cevap şeklinde değil, görev başlatma ve görev durumunu izleme şeklinde tasarlamıştır. Backend üretim isteğini aldıktan sonra harici servisten taskId alır ve bunu Model kaydıyla ilişkilendirir.",
                "Frontend tarafındaki üretim durumu yönetimi, aktif üretim görevini kullanıcının oturum deneyimi içinde görünür tutar. Bu sayede kullanıcı sayfadan ayrılsa veya katalogda gezinmeye devam etse bile üretim görevi tamamen unutulmaz. Bu yaklaşım özellikle 3D model üretiminin saniyeler değil dakikalar sürebileceği durumlarda önemlidir.",
            ],
        ),
        (
            "2.7.4. Backend Doğrulama ve Hata Yönetimi",
            [
                "Backend katmanında gelen isteklerin biçimsel doğruluğu Zod şemalarıyla denetlenmiştir. Kayıt, giriş, profil güncelleme, ürün ekleme, yorum, soru, cevap, mesaj, sipariş ve görsel arama isteklerinin her biri beklenen tip, uzunluk ve zorunlu alanlara göre kontrol edilir. Bu yaklaşım hatalı verinin veritabanına ulaşmasını engeller.",
                "Hata yönetiminde kullanıcıya teknik ayrıntı yerine anlaşılır mesaj döndürme yaklaşımı kullanılmıştır. Görsel arama kotası, geçersiz API anahtarı, üretim servisinin yanıt vermemesi veya dosya formatı uyuşmazlığı gibi durumlar ayrı ayrı ele alınmıştır. Bu tasarım sistemin hata anında sessiz kalmasını önler.",
            ],
        ),
        (
            "2.7.5. Model Dosyası ve 3D Önizleme Tasarımı",
            [
                "AI üretim görevi başarıyla tamamlandığında backend model dosyasını indirir ve dosya türünü kontrol eder. GLB formatındaki modeller doğrudan önizlenebilir dosya olarak saklanırken, STL formatındaki modeller için güvenli önizleme verisi üretilebilir. Bu ayrım, farklı servislerden gelen çıktı formatlarının aynı uygulamada yönetilebilmesi için gereklidir.",
                "3D önizleme bileşeni Three.js ekosistemi üzerine kurulmuştur. ModelViewer bileşeni modeli yükler, merkezler, kamera sınırlarını ayarlar ve kullanıcıya döndürme/inceleme olanağı verir. Model dosyalarına erişim ise güvenli uç nokta üzerinden yapılır; kullanıcı yalnızca kendi modeline veya tarafı olduğu konuşmaya bağlı modele erişebilir.",
            ],
        ),
        (
            "2.7.6. Pazaryeri ve Satıcı Ürün Yönetimi",
            [
                "Pazaryeri modülü, AI üretimden bağımsız olarak çalışan hazır ürün katalogunu temsil eder. Satıcı; ürün adı, açıklama, kategori, fiyat ve görseller ile katalog ürünü oluşturur. Kullanıcılar bu ürünleri arayabilir, kategori ve maksimum fiyat filtreleriyle daraltabilir, ürün görsellerini inceleyebilir ve satıcıya mesaj gönderebilir.",
                "Ürün yönetiminde pasif hale getirme yaklaşımı tercih edilmiştir. Satıcı bir ürünü kaldırdığında kayıt tamamen yok edilmek yerine görünürlükten çıkarılabilir. Bu yaklaşım, ileride sipariş geçmişi, konuşma kayıtları ve raporlama ihtiyaçları için veri bütünlüğünün korunmasına yardımcı olur.",
            ],
        ),
        (
            "2.7.7. Mesajlaşma ve Sipariş Durum Yaşam Döngüsü",
            [
                "Mesajlaşma modülü kullanıcı ile satıcı arasında ürün veya AI modeli bağlamında konuşma oluşturur. Katalog ürünleri için konuşma satıcının ürün sahibi olması üzerinden açılırken, AI modeli için kullanıcı mesaj göndermek istediği satıcıyı seçebilir. Bu fark, hazır ürün alımı ile özel üretim talebi arasındaki iş akışı farkını yansıtır.",
                "Konuşma kayıtlarında buyerId, sellerId, modelId, modelType ve status alanları bulunur. Status alanı yalnızca mesajlaşma durumunu değil, sipariş yaşam döngüsünü de temsil eder. ORDERED, PREPARING, SHIPPED, COMPLETED ve CANCELLED değerleri alıcı ve satıcı arasında sipariş takibinin izlenebilir bir süreç olarak yürütülmesini sağlar.",
            ],
        ),
        (
            "2.7.8. Dağıtım, Ortam Değişkenleri ve Sürdürme Yaklaşımı",
            [
                "Frontend dağıtımı için Netlify yapılandırması hazırlanmıştır. Netlify yalnızca frontend uygulamasını yayınladığı için backend'in ayrı bir web servisi olarak çalışması gerekir. Bu ayrım README içinde açık biçimde belirtilmiş ve canlı ortamda localhost adreslerinin kullanılmaması gerektiği vurgulanmıştır.",
                "Backend tarafında DATABASE_URL, JWT_SECRET, FRONTEND_URLS, SERPAPI_API_KEY, TRIPO_API_KEY ve HITEM3D anahtarları gibi değerler ortam değişkenleriyle yönetilir. Böylece gizli bilgiler kaynak koduna yazılmaz. Modüler rota yapısı ise Auth, AI, models, chat, examples ve images alanlarının ayrı dosyalarda sürdürülebilmesini sağlar.",
            ],
        ),
    ]
    for heading, paragraphs in sections:
        bt.add_section_heading(doc, heading)
        for paragraph in paragraphs:
            bt.add_para(doc, paragraph)

    bt.add_para(
        doc,
        "Ayrıntılı modül tasarımında ortaya çıkan en önemli sonuç, PrintForge'un tek bir servis entegrasyonundan ibaret olmadığıdır. Sistem, harici AI üretimini kullanıcı deneyimi, güvenlik, veri modeli, pazaryeri ve mesajlaşma katmanlarıyla birlikte ele almaktadır. Bu nedenle proje kapsamı, klasik bir katalog uygulaması veya yalnızca görselden model üreten bir arayüzden daha geniştir.",
    )
    rows = [
        ["Katman", "Sorumluluk", "Kontrol noktası"],
        ["Frontend", "Kullanıcı etkileşimi, yönlendirme, 3D önizleme ve üretim durumu", "Rol tabanlı görünürlük ve anlaşılır durum mesajı"],
        ["Backend", "Doğrulama, kimlik, iş kuralları ve harici servis çağrıları", "Zod şemaları, JWT doğrulaması ve hata kodları"],
        ["Veri modeli", "Kullanıcı, model, konuşma, mesaj ve katalog ilişkileri", "Prisma ilişkileri ve indeksler"],
        ["Dosya yönetimi", "Model dosyaları ve görsel bağlantıları", "Uploads dizini sınırı ve yetki kontrolü"],
        ["Harici servisler", "Görsel arama, görsel yükleme ve AI üretim", "Timeout, kota ve anahtar hatası yönetimi"],
    ]
    bt.add_table(doc, "Tablo 2.5. Ayrıntılı mimari katmanlar ve kontrol noktaları", rows, [3.2, 6.2, 6.1], "Proje kaynak kodu ve modül sorumlulukları esas alınarak hazırlanmıştır.", 9)

    bt.add_section_heading(doc, "2.8. İş Paketleri ve Zaman Yönetimi")
    bt.add_para(
        doc,
        "Bitirme projesi süreci, yalnızca kod yazımı olarak değil; ihtiyaç analizi, mimari kararlar, uygulama geliştirme, entegrasyon, test ve raporlama adımlarını kapsayan bir mühendislik süreci olarak planlanmıştır. Bu nedenle iş paketleri çıktıya göre ayrılmıştır. Her iş paketinin sonunda kontrol edilebilir bir çıktı üretilmesi hedeflenmiştir.",
    )
    bt.add_para(
        doc,
        "İş paketlerinin sıralı tasarlanması, projenin son aşamada bütünleşik görünmesini sağlamıştır. Örneğin AI üretim sayfası katalog ve mesajlaşma modülleri olmadan yalnızca model oluşturan bir araç olarak kalacaktı. Mesajlaşma ve sipariş modüllerinin eklenmesiyle AI çıktısının gerçek üretim talebine dönüşmesi mümkün hale gelmiştir.",
    )
    rows = [
        ["İş paketi", "Amaç", "Çıktı"],
        ["İhtiyaç analizi", "3D baskı kullanıcılarının model ve satıcı bulma problemini tanımlamak", "Problem tanımı, araştırma sorusu ve kapsam"],
        ["Mimari tasarım", "Frontend, backend, veri modeli ve servis ayrımını planlamak", "Sistem mimarisi ve Prisma şeması"],
        ["Katalog geliştirme", "Satıcı ürünlerini ve kullanıcı katalog deneyimini oluşturmak", "Pazaryeri, ürün kartları, filtreler, detaylar"],
        ["AI akışı", "Referans görselden üretim görevine geçişi sağlamak", "Örnekler, prompt aktarımı, görev izleme"],
        ["Mesaj/sipariş", "Satıcı-kullanıcı iletişimini ve sipariş durumlarını izlemek", "Konuşma, mesaj, sipariş ekranları"],
        ["Test ve raporlama", "Derleme, senaryo ve hata durumlarını doğrulamak", "Derleme çıktıları, test tabloları, tez metni"],
    ]
    bt.add_table(doc, "Tablo 2.6. İş paketleri ve çıktıları", rows, [3.2, 6.1, 6.2], "Proje geliştirme süreci esas alınarak hazırlanmıştır.", 9)


def add_chapter_three(doc: Document, diagrams: dict[str, Path]) -> None:
    doc.add_page_break()
    bt.add_main_heading(doc, "ÜÇÜNCÜ BÖLÜM")
    bt.add_main_heading(doc, "BULGULAR VE TARTIŞMA")
    bt.add_section_heading(doc, "3.1. Gerçekleştirilen Modüller")
    bt.add_para(
        doc,
        "PrintForge projesi kapsamında kullanıcı, satıcı ve admin rollerini destekleyen bütünleşik bir web uygulaması geliştirilmiştir. Sistem; ürün katalogu, örnek görsel arama, AI destekli model üretimi, satıcı ürün yönetimi, favoriler, sepet, mesajlaşma ve sipariş takibi modüllerinden oluşmaktadır. Bulgular, uygulamanın yalnızca tek bir ekran prototipi olmadığını, farklı kullanıcı rollerinin gerçek iş akışlarını destekleyen uçtan uca bir sistem yapısına ulaştığını göstermektedir.",
    )
    bt.add_para(
        doc,
        "Geliştirilen modüller kullanıcı tarafında fikir seçme, model oluşturma ve satıcıyla iletişime geçme ihtiyacını; satıcı tarafında ise ürün ekleme, katalogda yayınlama ve gelen talepleri takip etme ihtiyacını karşılamaktadır. Admin örnekleri ve internet görsel araması, AI üretim akışının başlangıç noktasını güçlendirmiştir. Bu yapı, 3D baskı hizmetini yalnızca teknik dosya üretimi olarak değil, pazaryeri ve iletişim akışıyla birlikte ele alan bir uygulama yaklaşımı sunmaktadır.",
    )
    bt.add_figure(doc, diagrams["fig_3_1"], "Şekil 3.1. Modül tamamlama durumu", 14.0)
    rows = [
        ["Bileşen", "Çalıştırılan doğrulama", "Sonuç"],
        ["Backend", "npm run build / tsc", "Başarılı. TypeScript derlemesi tamamlandı."],
        ["Frontend", "npm run build / next build", "Başarılı. Next.js üretim derlemesi tamamlandı."],
        ["Arayüz ekranları", "Manuel gezinme ve ekran görüntüsü kontrolü", "Ana akış ekranları başarıyla görüntülendi."],
        ["Kullanıcı rolleri", "USER, SELLER ve ADMIN ayrımı", "Rol tabanlı menü ve sayfa akışları doğrulandı."],
    ]
    bt.add_table(
        doc,
        "Tablo 3.1. Derleme doğrulama sonuçları",
        rows,
        [3.2, 5.3, 7.0],
        "Proje üzerinde çalıştırılan derleme komutları ve manuel arayüz kontrolleri esas alınmıştır.",
        9,
    )

    doc.add_page_break()
    bt.add_section_heading(doc, "3.2. Arayüz ve Kullanıcı Akışı Bulguları")
    bt.add_para(
        doc,
        "Bu alt bölümde uygulamanın çalışan web arayüzünden alınan ekran görüntüleri sunulmaktadır. Ekran görüntülerinin amacı, geliştirilen modüllerin yalnızca metin düzeyinde açıklanmadığını, gerçek uygulama üzerinde çalışır biçimde gözlemlendiğini göstermektir. Görseller, tezdeki mimari ve yöntem açıklamalarını somutlaştırmak için kullanılmıştır.",
    )
    add_screen_figure(
        doc,
        "site_home.png",
        "Şekil 3.2. Ana sayfa ve değer önerisi ekranı",
        "Ana sayfa, platformun temel değer önerisini kullanıcıya ilk ekranda sunmaktadır. Sabit fiyatlı katalog ve AI ile model oluşturma seçeneklerinin aynı yüzeyde verilmesi, kullanıcının platformu pazaryeri ve üretim aracı olarak birlikte algılamasını sağlamaktadır.",
        "Bu ekran, çalışmanın problem tanımında belirtilen dağınık hizmet akışını tek giriş noktasında toplama hedefinin arayüz karşılığını göstermektedir. Kullanıcı katalog veya AI üretim yönlerinden birini seçerek aynı platform içinde ilerleyebilmektedir.",
    )
    add_screen_figure(
        doc,
        "catalog_empty.png",
        "Şekil 3.3. Katalog ve filtreleme ekranı",
        "Katalog ekranı arama, kategori ve maksimum fiyat filtreleriyle yapılandırılmıştır. Henüz ürün yok durumunun boş bırakılmaması, satıcı katılımı ve AI model oluşturma akışına yönlendirme yaparak kullanıcıyı sistem içinde tutmaktadır.",
        "Katalog yapısı, ileride ürün sayısı arttığında kullanıcıya arama ve sınıflandırma desteği verecek şekilde tasarlanmıştır. Boş durum ekranının yönlendirici olması, kullanılabilirlik açısından önemli bir tasarım kararıdır.",
    )
    add_screen_figure(
        doc,
        "examples_search.png",
        "Şekil 3.4. Örnek görsel arama ekranı",
        "Örnekler ekranı, kullanıcının üretim fikrine hızlı başlaması için hazır arama önerileri ve görsel sonuçlar sunmaktadır. Görsel arama sonucunun AI üretim sayfasına aktarılabilmesi, fikir aşaması ile model üretimi arasındaki geçişi kısaltmaktadır.",
        "Bu akış, modelleme bilgisi olmayan kullanıcı için fikir bulma eşiğini düşürmektedir. Kullanıcı boş bir metin alanıyla başlamak yerine görsel referans üzerinden üretim niyetini somutlaştırabilmektedir.",
    )
    add_screen_figure(
        doc,
        "ai_generator.png",
        "Şekil 3.5. AI model üretim ekranı",
        "AI model üretim ekranında referans görsel yükleme, model açıklaması yazma ve önceki üretimleri izleme alanları bulunmaktadır. Bu yapı, kullanıcının yalnızca görsel seçip beklemesini değil, üretim amacını açıklayarak daha kontrollü bir sonuç hedeflemesini sağlamaktadır.",
        "AI üretim ekranının ayrı bir çalışma alanı olarak tasarlanması, uzun sürebilen üretim görevlerinin katalog ve mesajlaşma ekranlarından bağımsız yönetilmesini sağlar. Böylece sistem yalnızca görsel arama yapan bir sayfa değil, üretim görevi başlatan bir modül haline gelir.",
    )
    add_screen_figure(
        doc,
        "login.png",
        "Şekil 3.6. Giriş ekranı",
        "Giriş ekranı, katalog, teklif ve AI model akışlarına devam etmek için kimlik doğrulama adımını sunmaktadır. Bu ekran, kullanıcıya ait favori, sepet, mesaj ve sipariş bilgilerinin korunabilmesi için rol tabanlı oturum yapısının başlangıç noktasıdır.",
        "Kimlik doğrulama yapısının sade tutulması, kullanıcıyı temel iş akışından koparmadan hesap güvenliğini sağlamayı hedeflemektedir. Bu ekran aynı zamanda satıcı ve normal kullanıcı rollerinin ayrıştırılacağı oturum bilgisini üretir.",
    )
    add_screen_figure(
        doc,
        "seller_products.png",
        "Şekil 3.7. Satıcı ürün yönetimi ekranı",
        "Satıcı ürün yönetimi ekranı, satıcının katalogda yayınladığı ürünleri tek noktadan görmesini ve yeni ürün ekleme akışına geçmesini sağlar. Bu ekran, platformun yalnızca alıcı tarafı için değil, satıcı operasyonları için de tasarlandığını göstermektedir.",
        "Satıcı panelinin bulunması, projenin pazaryeri boyutunu güçlendirmektedir. Ürün yönetimi alıcı arayüzünden ayrıldığı için satıcı, katalog içeriğini daha düzenli biçimde kontrol edebilmektedir.",
    )
    add_screen_figure(
        doc,
        "seller_add_product.png",
        "Şekil 3.8. Satıcı ürün ekleme ekranı",
        "Ürün ekleme ekranı ürün adı, açıklama, kategori, fiyat ve görsel yükleme alanlarını içerir. Yayın önizlemesinin aynı sayfada bulunması, satıcının ürünün katalogda nasıl görüneceğini yayın öncesinde değerlendirmesini sağlar.",
        "Form yapısında fiyatın sabit değer olarak alınması, projenin pazarlık yerine net fiyat ve mesajlaşma akışını önceleyen yaklaşımıyla uyumludur. Görsel yükleme alanı ise ürünün katalogda güven verici biçimde sunulması için gereklidir.",
    )
    add_screen_figure(
        doc,
        "favorites.png",
        "Şekil 3.9. Favoriler ekranı",
        "Favoriler ekranı, kullanıcının ilgilendiği ürünleri daha sonra incelemek üzere saklamasına olanak tanımaktadır. Bu özellik, katalog inceleme davranışını tek oturumluk bir işlem olmaktan çıkarıp kullanıcı hesabına bağlı kalıcı bir deneyime dönüştürmektedir.",
        "Favoriler modülü, kullanıcı karar verme sürecini destekleyen yardımcı bir bileşendir. Özellikle çok sayıda katalog ürünü olduğunda kullanıcı, satın alma veya mesajlaşma kararını erteleyebilmekte ve ilgilendiği ürünleri kaybetmemektedir.",
    )
    add_screen_figure(
        doc,
        "messages.png",
        "Şekil 3.10. Mesajlar ekranı",
        "Mesajlar ekranı satıcı ve müşteri konuşmalarını sipariş ekranından ayrı olarak yönetmektedir. Bu ayrım, ürün hakkında bilgi alma, teklif netleştirme ve üretim sürecini konuşma gibi iletişim ihtiyaçlarının düzenli takip edilmesini sağlar.",
        "Mesajlaşma modülü, AI üretim veya katalog ürünü sonrasında satıcıyla temas kurulmasını sağlayan ana bağlantıdır. Siparişten ayrı tutulması, bilgi alma konuşmaları ile aktif üretim süreçlerinin karışmasını azaltmaktadır.",
    )
    add_screen_figure(
        doc,
        "orders.png",
        "Şekil 3.11. Sipariş takip ekranı",
        "Sipariş takip ekranı, satıcının gelen siparişleri ve sipariş durumu değişikliklerini görmesi için tasarlanmıştır. Mesaj ekranından ayrılan bu yapı, iletişim ile üretim/sipariş takibinin karışmasını azaltır.",
        "Sipariş ekranı, projenin yalnızca model fikri üretmekle kalmayıp hizmet sürecini takip edebilecek bir pazaryeri altyapısına yöneldiğini göstermektedir. İleride ödeme, kargo ve üretim aşaması bildirimleri bu ekran üzerinden genişletilebilir.",
    )

    doc.add_page_break()
    bt.add_section_heading(doc, "3.3. Derleme ve Teknik Doğrulama Bulguları")
    bt.add_para(
        doc,
        "Projenin teknik doğrulaması için backend ve frontend üretim derlemeleri çalıştırılmıştır. Backend katmanında TypeScript derlemesi hata vermeden tamamlanmıştır. Frontend katmanında Next.js üretim derlemesi tamamlanmış ve uygulama sayfaları üretim çıktısı içinde listelenmiştir. Derleme sırasında görülen önbellek uyarıları uygulamanın çalışmasını engelleyen işlevsel hata olarak değerlendirilmemiştir.",
    )
    bt.add_figure(doc, diagrams["fig_3_2"], "Şekil 3.12. Derleme ve doğrulama özeti", 14.0)

    bt.add_section_heading(doc, "3.4. Kullanıcı Akışlarına İlişkin Bulgular")
    bt.add_para(
        doc,
        "Kullanıcı akışları incelendiğinde PrintForge'un fikir aşamasından satıcıyla iletişim aşamasına kadar kesintisiz bir deneyim sunduğu görülmektedir. Kullanıcı örnekler sayfasında bir görsel arayabilir, seçilen görselden AI üretim ekranına geçebilir, katalog ürünlerini inceleyebilir, favori veya sepet listesi oluşturabilir ve satıcıya mesaj gönderebilir. Satıcı ise ürünlerini yayınlayabilir ve sipariş takibini ayrı bir ekranda gerçekleştirebilir.",
    )
    rows = [
        ["Akış", "Gerçekleşen davranış", "Kullanıcı katkısı"],
        ["Örnekten AI üretime geçiş", "Görsel ve bağlam AI üretim ekranına taşınır.", "Kullanıcı boş prompt alanıyla başlamaz."],
        ["Katalog", "Ürünler arama, kategori ve fiyat filtresiyle incelenir.", "Hazır üretim seçeneklerine hızlı erişim sağlanır."],
        ["Satıcı paneli", "Ürün görseli, kategori, açıklama ve fiyat yönetilir.", "Satıcı teknik destek almadan katalog oluşturabilir."],
        ["Mesajlaşma", "Satıcı ve kullanıcı konuşmaları ayrı ekranda tutulur.", "Üretim öncesi iletişim izlenebilir hale gelir."],
        ["Sipariş takibi", "Gelen siparişler durum akışıyla izlenir.", "Üretim sürecinin takibi kolaylaşır."],
    ]
    bt.add_table(
        doc,
        "Tablo 3.2. Gerçekleştirilen kullanıcı akışları",
        rows,
        [3.2, 5.3, 7.0],
        "Frontend sayfaları ve kullanıcı senaryoları birlikte incelenerek hazırlanmıştır.",
        9,
    )

    bt.add_section_heading(doc, "3.5. Güvenlik, Sınırlılıklar ve Geliştirme Önerileri")
    bt.add_para(
        doc,
        "Güvenlik açısından elde edilen en önemli bulgu, hassas servis anahtarlarının frontend tarafına taşınmadan backend üzerinden yönetilmesidir. Görsel arama sağlayıcıları, AI üretim servisleri ve veritabanı bağlantısı ortam değişkenleriyle ayrılmıştır. Kimlik doğrulama akışı JWT ve bcrypt ile desteklenmekte, korunan rotalarda token doğrulaması yapılmaktadır.",
    )
    bt.add_para(
        doc,
        "Sistemin temel sınırlılıkları AI üretim kalitesinin harici servise bağlı olması, modelin baskıya uygunluğunun otomatik mühendislik analiziyle doğrulanmaması ve ödeme/kargo entegrasyonlarının bitirme projesi kapsamı dışında bırakılmasıdır. Buna karşın mevcut mimari, çoklu AI sağlayıcı desteği, maliyet tahmini, baskı uygunluk analizi ve ödeme entegrasyonu gibi geliştirmeler için genişletilebilir bir temel sunmaktadır.",
    )
    rows = [
        ["Sınırlılık", "Etkisi", "Geliştirme önerisi"],
        ["AI servis bağımlılığı", "Üretim süresi ve çıktı kalitesi dış servise bağlıdır.", "Birden fazla sağlayıcı için yedekleme mekanizması kurulabilir."],
        ["Baskı uygunluk analizi yok", "Modelin hacim, duvar kalınlığı ve destek ihtiyacı otomatik yorumlanmaz.", "STL/GLB geometri analizi ve uygunluk puanı eklenebilir."],
        ["Telif/lisans kontrolü sınırlı", "Harici görsellerin kullanım hakkı kullanıcı sorumluluğundadır.", "Lisans filtresi ve kaynak uyarıları geliştirilebilir."],
        ["Ödeme ve lojistik entegrasyonu yok", "Sipariş akışı iletişim ve durum takibi düzeyindedir.", "Ödeme, kargo ve fatura modülleri eklenebilir."],
        ["Maliyet tahmini yok", "Kullanıcı üretim maliyetini satıcıyla konuşarak öğrenir.", "Malzeme, hacim ve doluluk oranına dayalı tahmin yapılabilir."],
    ]
    bt.add_table(
        doc,
        "Tablo 3.3. Sınırlılıklar ve geliştirme önerileri",
        rows,
        [3.2, 5.0, 7.3],
        "Proje kapsamı ve test bulguları esas alınarak hazırlanmıştır.",
        9,
    )

    bt.add_section_heading(doc, "3.6. Tartışma")
    bt.add_para(
        doc,
        "Elde edilen bulgular, PrintForge'un araştırma sorusuna olumlu yanıt verdiğini göstermektedir. Teknik modelleme bilgisi sınırlı kullanıcılar için referans görsel seçimi, AI üretim görevi ve satıcıyla iletişim tek bir web uygulamasında birleştirilebilmiştir. Bu yönüyle proje, 3D baskının yaygınlaşmasında yalnızca üretim donanımının değil, kullanıcıyı doğru hizmet akışına yönlendiren yazılım arayüzlerinin de önemli olduğunu göstermektedir.",
    )
    bt.add_para(
        doc,
        "Literatürde eklemeli imalatın dağıtık üretim ve kişiselleştirme potansiyeli vurgulanırken kalite kontrol ve standartlaşma sorunlarının sürdüğü görülmektedir (Ford ve Despeisse,2016:1573-1587; Ngo vd.,2018:172-196). PrintForge bu sorunları tamamen çözmemekte, ancak kullanıcı-satıcı iletişimi ve AI destekli başlangıç akışıyla 3D baskıya erişim bariyerlerini azaltan uygulanabilir bir ara katman sunmaktadır.",
    )
    bt.add_para(
        doc,
        "Bu nedenle projenin katkısı, yeni bir 3D üretim algoritması önermekten çok, mevcut AI ve web teknolojilerini 3D baskı hizmet sürecine bütünleşik şekilde uygulamasıdır. Tez kapsamında sunulan ekran görüntüleri, sistemin gerçek arayüz akışlarını desteklediğini ve projenin savunmada gösterilebilir bir yazılım çıktısı niteliği taşıdığını ortaya koymaktadır.",
    )


def build(total_pages: int = 50) -> None:
    configure_lists()
    page_map_path = WORKSPACE / "thesis_work" / "page_map_45.json"
    page_map_path.write_text(json.dumps(PAGE_MAP, ensure_ascii=False, indent=2), encoding="utf-8")

    diagrams = bt.make_diagrams()
    doc = Document()
    bt.configure_styles(doc)
    bt.setup_section(doc.sections[0], footer=False)
    bt.add_cover_pages(doc, total_pages)

    front = doc.add_section(WD_SECTION.NEW_PAGE)
    bt.setup_section(front, footer=True, start=5, fmt="lowerRoman")
    bt.add_abstracts(doc, total_pages)
    bt.add_front_matter(doc, PAGE_MAP)

    main = doc.add_section(WD_SECTION.NEW_PAGE)
    bt.setup_section(main, footer=True, start=1, fmt="decimal")
    bt.add_intro(doc)
    bt.add_chapter_one(doc, diagrams)
    bt.add_chapter_two(doc, diagrams)
    add_extended_technical_design_compact(doc)
    add_chapter_three(doc, diagrams)
    bt.add_conclusion_refs_appendices(doc)
    bt.enable_update_fields_on_open(doc)
    doc.save(OUT_PATH)
    print(OUT_PATH)


if __name__ == "__main__":
    build()
