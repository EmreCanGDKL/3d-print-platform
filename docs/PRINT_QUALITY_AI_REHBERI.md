# PrintForge Quality AI Rehberi

Bu modül, FDM baskı fotoğrafından olası baskı hatasını tahmin etmek için eklendi.

## Projedeki ekran

- Sayfa: `/print-quality`
- Backend API: `/api/print-quality/analyze`
- Backend dosyası: `backend/src/routes/printQuality.ts`

Eğitilmiş model bağlanana kadar API demo tahmin modunda çalışır. Bu mod, ekranın ve iş akışının test edilebilmesi içindir. Gerçek eğitim tamamlandığında Python model servisi çalıştırılır ve backend `PRINT_QUALITY_MODEL_URL` ortam değişkeniyle ona bağlanır.

## Dataset

Önerilen dataset:

- Kaggle: `wengmhu/fdm-3d-printing-defect-dataset`
- Amaç: FDM baskı hata sınıflandırması

Kaggle datasetleri çoğu zaman hesap ve API anahtarı istediği için otomatik indirme yerine şu adımları kullan:

1. Kaggle hesabına gir.
2. Account bölümünden `Create New API Token` ile `kaggle.json` indir.
3. Bilgisayarında Kaggle CLI kur:

```bash
pip install kaggle
```

4. Dataseti indir:

```bash
kaggle datasets download -d wengmhu/fdm-3d-printing-defect-dataset -p datasets/print_quality --unzip
```

5. Klasör yapısını kontrol et. Eğitim scripti en kolay şu yapıyla çalışır:

```text
datasets/print_quality/
  cracking/
  off_platform/
  warping/
  stringing/
  layer_shift/
```

İndirilen Kaggle datasetinde klasörler genellikle şu yoldadır:

```text
datasets/print_quality/FDM-3D-Printing-Defect-Dataset/data/
  Cracking/
  Layer_shifting/
  Off_platform/
  Stringing/
  Warping/
```

Bu yapı doğrudan kullanılabilir.

## Eğitme

Python sanal ortamı oluştur:

```bash
cd scripts/print_quality_ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Modeli eğit:

```bash
python train_defect_classifier.py --data-dir ../../datasets/print_quality/FDM-3D-Printing-Defect-Dataset/data --output-dir ../../backend/ml/print_quality
```

Eğitim sonunda şu dosyalar oluşur:

```text
backend/ml/print_quality/print_quality_model.keras
backend/ml/print_quality/labels.json
```

## Model servisini çalıştırma

```bash
cd scripts/print_quality_ai
.venv\Scripts\activate
python serve_model.py --model ../../backend/ml/print_quality/print_quality_model.keras --labels ../../backend/ml/print_quality/labels.json
```

Servis varsayılan olarak `http://localhost:5055/predict` adresinde çalışır.

Backend `.env` dosyasına ekle:

```env
PRINT_QUALITY_MODEL_URL="http://localhost:5055/predict"
```

Sonra backend'i yeniden başlat. `/print-quality` ekranındaki sonuç kaynağı `Eğitilmiş model` olarak görünmelidir.

## Render canlı servis ayarı

Python AI servisini Render'da ayrı bir Web Service olarak aç. Root Directory alanını boş bırak.

Build Command:

```bash
pip install -r scripts/print_quality_ai/requirements.txt
```

Start Command:

```bash
python -m uvicorn serve_model:app --host 0.0.0.0 --port $PORT --app-dir scripts/print_quality_ai
```

Environment Variables:

```env
PYTHON_VERSION=3.11.9
PRINT_QUALITY_MODEL_PATH=backend/ml/print_quality/print_quality_model.keras
PRINT_QUALITY_LABELS_PATH=backend/ml/print_quality/labels.json
```

`PYTHON_VERSION` özellikle gereklidir. Render varsayılan olarak daha yeni Python sürümü seçerse Pillow veya TensorFlow kurulumu hata verebilir.

## Bitirme projesinde anlatılabilecek nokta

Bu özellik hazır 3D üretim servisinden farklıdır. Burada model, FDM baskı fotoğraflarıyla eğitilerek hata sınıfı tahmini yapar. Kullanıcıya yalnızca sınıf adı değil, pratik çözüm önerileri de sunulur.
