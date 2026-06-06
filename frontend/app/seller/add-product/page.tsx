'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Star, Trash2, UploadCloud } from 'lucide-react';
import { uploadFiles } from '@/utils/uploadthing';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

const copy = {
  tr: {
    categories: [
      { value: 'art', label: 'Sanat ve dekor' },
      { value: 'functional', label: 'Fonksiyonel parçalar' },
      { value: 'figurine', label: 'Figürler' },
      { value: 'mechanical', label: 'Mekanik parçalar' },
      { value: 'jewelry', label: 'Aksesuar / mücevher' },
    ],
    priceEmpty: 'Fiyat girin',
    nameRequired: 'Ürün adı zorunludur.',
    descriptionRequired: 'Açıklama en az 10 karakter olmalıdır.',
    priceRequired: 'Geçerli bir fiyat girin.',
    imageRequired: 'En az bir ürün görseli yükleyin.',
    saveFailed: 'Ürün kaydedilemedi.',
    saveSuccess: 'Ürün başarıyla kataloğa eklendi. Yönlendiriliyorsunuz...',
    serverFailed: 'Sunucuya bağlanılamadı.',
    sellerRequiredTitle: 'Satıcı hesabı gerekli',
    sellerRequiredText: 'Ürün eklemek için satıcı rolüyle giriş yapmanız gerekir.',
    panel: 'Satıcı paneli',
    title: 'Kataloğa ürün ekle',
    description: 'Ürün görsellerinizi yükleyin. Ürünler tek fiyatla katalogda yayınlanır, pazarlık fiyatı girilmez.',
    productName: 'Ürün adı',
    productNamePlaceholder: 'Örn. Ayarlanabilir telefon standı',
    productDescription: 'Açıklama',
    productDescriptionPlaceholder: 'Boyut, kullanım alanı, önerilen malzeme ve üretim notlarını yazın.',
    category: 'Kategori',
    price: 'Fiyat',
    images: 'Ürün görselleri',
    imagesHelp: 'En fazla 5 görsel yükleyebilirsiniz. AI model üretimi ayrı sayfada aynen devam eder.',
    saving: 'Ürün kaydediliyor...',
    uploading: 'Görseller yükleniyor...',
    selectImages: 'Görsel seç',
    changeImages: 'Görselleri değiştir',
    maxImages: 'Tek bir ürün için en fazla 5 fotoğraf seçebilirsiniz.',
    cover: 'Kapak',
    makeCover: 'Kapak yap',
    removeImage: 'Kaldır',
    uploadNoUrl: 'Yükleme tamamlandı ancak görsel bağlantısı alınamadı.',
    uploadFailed: 'Görsel yüklenemedi',
    uploadTokenInvalid: 'Görsel yükleme servisi yapılandırılmamış. UPLOADTHING_TOKEN değerini frontend/.env.local dosyasına ve canlıda Netlify Environment Variables alanına ekleyip uygulamayı yeniden başlatın.',
    uploadLabel: 'Dosya seçin veya buraya sürükleyin',
    uploadButton: 'Görselleri yükle',
    uploadAllowed: 'En fazla 5 görsel, her biri 8 MB',
    uploadReady: 'Görseller yüklendi. Bilgileri kontrol edip ürünü yayınlayın.',
    uploadedImages: 'yüklenen görsel',
    publish: 'Ürünü yayınla',
    preview: 'Yayın önizlemesi',
    product: 'Ürün',
    productFallback: 'Ürün adı',
    previewTip: 'Açıklaması net, fiyatı tek ve görselleri kaliteli ürünler daha hızlı ilgi görür.',
    apiFallback: 'Ürün API cevabı okunamadı. Backend bağlantısını kontrol edin.',
  },
  en: {
    categories: [
      { value: 'art', label: 'Art and decor' },
      { value: 'functional', label: 'Functional parts' },
      { value: 'figurine', label: 'Figures' },
      { value: 'mechanical', label: 'Mechanical parts' },
      { value: 'jewelry', label: 'Accessories / jewelry' },
    ],
    priceEmpty: 'Enter price',
    nameRequired: 'Product name is required.',
    descriptionRequired: 'Description must be at least 10 characters.',
    priceRequired: 'Enter a valid price.',
    imageRequired: 'Upload at least one product image.',
    saveFailed: 'Product could not be saved.',
    saveSuccess: 'Product was added to the catalog. Redirecting...',
    serverFailed: 'Could not connect to the server.',
    sellerRequiredTitle: 'Seller account required',
    sellerRequiredText: 'You need to log in with a seller account to add products.',
    panel: 'Seller panel',
    title: 'Add product to catalog',
    description: 'Upload product images. Products are published with one fixed price; negotiation prices are not entered.',
    productName: 'Product name',
    productNamePlaceholder: 'Ex. Adjustable phone stand',
    productDescription: 'Description',
    productDescriptionPlaceholder: 'Write dimensions, use case, recommended material, and production notes.',
    category: 'Category',
    price: 'Price',
    images: 'Product images',
    imagesHelp: 'You can upload up to 5 images. AI model generation continues on its own page.',
    saving: 'Saving product...',
    uploading: 'Uploading images...',
    selectImages: 'Select images',
    changeImages: 'Change images',
    maxImages: 'You can select up to 5 photos for one product.',
    cover: 'Cover',
    makeCover: 'Make cover',
    removeImage: 'Remove',
    uploadNoUrl: 'Upload finished, but no image URL was returned.',
    uploadFailed: 'Image upload failed',
    uploadTokenInvalid: 'The image upload service is not configured. Add UPLOADTHING_TOKEN to frontend/.env.local and to Netlify Environment Variables in production, then restart the app.',
    uploadLabel: 'Choose files or drag and drop',
    uploadButton: 'Upload images',
    uploadAllowed: 'Up to 5 images, 8 MB each',
    uploadReady: 'Images are uploaded. Review the details and publish the product.',
    uploadedImages: 'uploaded images',
    publish: 'Publish product',
    preview: 'Publication preview',
    product: 'Product',
    productFallback: 'Product name',
    previewTip: 'Products with clear descriptions, fixed prices, and quality images attract interest faster.',
    apiFallback: 'The product API response could not be read. Check the backend connection.',
  },
};

type StoredUser = {
  role?: string;
};

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxSize = 1200;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth || maxSize, image.naturalHeight || maxSize));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((image.naturalWidth || maxSize) * scale));
      canvas.height = Math.max(1, Math.round((image.naturalHeight || maxSize) * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image could not be prepared.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be prepared.'));
    };

    image.src = objectUrl;
  });
}

export default function AddProductPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('art');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSeller, setIsSeller] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const selectedImagesRef = useRef<SelectedImage[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    if (!token || !rawUser) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(rawUser) as StoredUser;
      setIsSeller(user.role === 'SELLER');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const pricePreview = useMemo(() => {
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) return text.priceEmpty;
    return `TL ${amount.toLocaleString(locale)}`;
  }, [locale, price, text.priceEmpty]);

  const validateForm = () => {
    const amount = Number(price);
    if (!name.trim()) return text.nameRequired;
    if (description.trim().length < 10) return text.descriptionRequired;
    if (!Number.isFinite(amount) || amount <= 0) return text.priceRequired;
    return '';
  };

  const orderedSelectedImages = useMemo(() => {
    if (selectedImages.length === 0) return [];
    const images = [...selectedImages];
    const [cover] = images.splice(coverIndex, 1);
    return cover ? [cover, ...images] : selectedImages;
  }, [coverIndex, selectedImages]);

  const handleImageSelection = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setUploadedImageUrls([]);
    setSuccess('');

    if (imageFiles.length > 5) {
      setError(text.maxImages);
      setSelectedImages([]);
      return;
    }

    setError('');
    setCoverIndex(0);
    setSelectedImages(
      imageFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    );
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((items) => {
      const next = items.filter((_, itemIndex) => itemIndex !== index);
      items[index] && URL.revokeObjectURL(items[index].previewUrl);
      return next;
    });
    setUploadedImageUrls([]);
    setCoverIndex((current) => Math.max(0, Math.min(current > index ? current - 1 : current, selectedImages.length - 2)));
  };

  const uploadSelectedImages = async () => {
    if (uploadedImageUrls.length > 0) return uploadedImageUrls;
    if (orderedSelectedImages.length === 0) {
      throw new Error(text.imageRequired);
    }

    const useEmbeddedImages = async () => Promise.all(orderedSelectedImages.map((image) => fileToDataUrl(image.file)));

    setIsUploading(true);
    try {
      const result = await uploadFiles('productImageUploader', {
        files: orderedSelectedImages.map((image) => image.file),
      });
      const urls = result.map((file: any) => file.url || file.ufsUrl).filter(Boolean);
      if (urls.length === 0) throw new Error(text.uploadNoUrl);
      setUploadedImageUrls(urls);
      return urls;
    } catch {
      const urls = await useEmbeddedImages();
      setUploadedImageUrls(urls);
      return urls;
    } finally {
      setIsUploading(false);
    }
  };

  const saveToDatabase = async () => {
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (selectedImages.length === 0 && uploadedImageUrls.length === 0) {
      setError(text.imageRequired);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadSelectedImages();
      const response = await fetchWithTimeout('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          imageUrls,
        }),
      });

      const data = await readJsonResponse<{ success?: boolean; error?: string; message?: string }>(response, text.apiFallback);

      if (!response.ok) {
        throw new Error(data.error || data.message || text.saveFailed);
      }

      setSuccess(text.saveSuccess);
      router.push('/marketplace');
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.serverFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSeller) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-2xl items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">{text.sellerRequiredTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{text.sellerRequiredText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-800">{text.panel}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{text.description}</p>
        </div>

        {error && (
          <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{text.productName}</label>
            <input
              type="text"
              value={name}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder={text.productNamePlaceholder}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{text.productDescription}</label>
            <textarea
              rows={4}
              value={description}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder={text.productDescriptionPlaceholder}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.category}</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {text.categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.price}</label>
              <input
                type="number"
                min={1}
                step={1}
                value={price}
                placeholder="350"
                className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setPrice(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-100 pt-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-950">{text.images}</h2>
          <p className="mb-4 text-sm text-slate-600">{text.imagesHelp}</p>
          {isSubmitting || isUploading ? (
            <div className="flex h-44 items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50">
              <span className="font-medium text-emerald-900">{isUploading ? text.uploading : text.saving}</span>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-5">
              <input
                id="product-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleImageSelection(event.target.files)}
                className="hidden"
              />
              <label
                htmlFor="product-images"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {selectedImages.length > 0 ? text.changeImages : text.selectImages}
              </label>
              <p className="mt-3 text-sm text-slate-600">{text.uploadAllowed}</p>
            </div>
          )}
          {selectedImages.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedImages.map((image, index) => (
                <div key={image.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div className="relative aspect-video bg-stone-100">
                    <img src={image.previewUrl} alt={image.file.name} className="h-full w-full object-cover" />
                    {index === coverIndex && (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                        {text.cover}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-3">
                    <p className="truncate text-xs font-semibold text-slate-700">{image.file.name}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCoverIndex(index)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-stone-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100"
                      >
                        <Star className="h-3.5 w-3.5" />
                        {text.makeCover}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(index)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-2 text-red-700 hover:bg-red-50"
                        aria-label={text.removeImage}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(selectedImages.length > 0 || uploadedImageUrls.length > 0) && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-emerald-900">
                  {selectedImages.length || uploadedImageUrls.length} {text.uploadedImages}
                </p>
                <button
                  type="button"
                  onClick={() => void saveToDatabase()}
                  disabled={isSubmitting || isUploading}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? text.uploading : isSubmitting ? text.saving : text.publish}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <UploadCloud className="h-8 w-8 text-emerald-700" />
        <h2 className="mt-4 text-lg font-semibold text-slate-950">{text.preview}</h2>
        <div className="mt-5 space-y-4 rounded-xl bg-stone-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{text.product}</p>
            <p className="mt-1 font-semibold text-slate-950">{name.trim() || text.productFallback}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{text.price}</p>
            <p className="mt-1 font-semibold text-slate-950">{pricePreview}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{text.category}</p>
            <p className="mt-1 font-semibold text-slate-950">{text.categories.find((item) => item.value === category)?.label}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{text.previewTip}</p>
      </aside>
    </div>
  );
}
