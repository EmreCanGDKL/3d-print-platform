'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Box, Cpu, ImageIcon, MessageSquare, Sparkles } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useLanguage } from '@/lib/language';

const PREVIEW_ROTATION_MS = 8000;

type CatalogPreviewProduct = {
  id: string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  imageUrls?: string[] | null;
  modelUrl?: string | null;
  seller?: {
    name?: string | null;
  } | null;
};

const copy = {
  tr: {
    categories: ['Prototip', 'Endüstriyel parça', 'Dekor', 'Figür', 'Mimari maket'],
    badge: 'AI destekli 3D baskı pazaryeri',
    title: 'Model fikrinden sabit fiyatlı ürün kataloğuna kadar tek platform.',
    description:
      'Hazır ürünleri keşfedin, yapay zeka ile yeni modeller oluşturun ve doğrulanmış satıcılarla net fiyat üzerinden iletişime geçin.',
    catalog: 'Kataloğu incele',
    ai: 'AI ile model oluştur',
    stats: [
      ['Sabit', 'tek fiyat modeli'],
      ['5 görsel', 'ürün görseli desteği'],
      ['TRY', 'yerel fiyatlandırma'],
    ],
    preview: 'Ürün önizleme',
    previewEmpty: 'Katalogda ürün bekleniyor',
    category: 'Kategori',
    seller: 'Satıcı',
    price: 'Fiyat',
    noImage: 'Görsel yok',
    note: 'Bu kart katalogdaki gerçek ürünlerden rastgele seçilir.',
    features: [
      {
        icon: Cpu,
        title: 'AI ile başlangıç',
        text: 'Fikrinizi metin veya görsel referansla modele dönüştürün; AI üretim akışı aynen devam eder.',
      },
      {
        icon: Box,
        title: 'Katalogdan keşif',
        text: 'Satıcıların yüklediği ürünleri kategori, tek fiyat ve görseller üzerinden karşılaştırın.',
      },
      {
        icon: MessageSquare,
        title: 'Net fiyat ve iletişim',
        text: 'Katalog ürünlerinde pazarlık yerine sabit fiyatı görün, teslim detaylarını mesajla netleştirin.',
      },
    ],
    popularTitle: 'Popüler üretim kategorileri',
    popularText: 'Prototipten dekoratif objelere kadar ürünleri daha hızlı bulun.',
  },
  en: {
    categories: ['Prototype', 'Industrial part', 'Decor', 'Figure', 'Architectural model'],
    badge: 'AI-powered 3D printing marketplace',
    title: 'One platform from model idea to fixed-price product catalog.',
    description:
      'Discover ready products, create new models with AI, and contact verified sellers with clear fixed pricing.',
    catalog: 'Browse catalog',
    ai: 'Create with AI',
    stats: [
      ['Fixed', 'single-price model'],
      ['5 images', 'product image support'],
      ['TRY', 'local pricing'],
    ],
    preview: 'Product preview',
    previewEmpty: 'Waiting for catalog products',
    category: 'Category',
    seller: 'Seller',
    price: 'Price',
    noImage: 'No image',
    note: 'This card is randomly selected from real catalog products.',
    features: [
      {
        icon: Cpu,
        title: 'Start with AI',
        text: 'Turn your idea into a model from text or a visual reference; the AI generation flow stays intact.',
      },
      {
        icon: Box,
        title: 'Explore the catalog',
        text: 'Compare seller products by category, fixed price, and images.',
      },
      {
        icon: MessageSquare,
        title: 'Clear price and contact',
        text: 'See the fixed catalog price and clarify delivery details through messages.',
      },
    ],
    popularTitle: 'Popular production categories',
    popularText: 'Find products faster, from prototypes to decorative objects.',
  },
};

export default function Home() {
  const { language } = useLanguage();
  const text = copy[language];
  const [previewProducts, setPreviewProducts] = useState<CatalogPreviewProduct[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewProduct, setPreviewProduct] = useState<CatalogPreviewProduct | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreviewProduct = async () => {
      try {
        const response = await fetch(apiUrl('/api/models'), { cache: 'no-store' });
        if (!response.ok) return;

        const products = (await response.json()) as CatalogPreviewProduct[];
        if (!Array.isArray(products) || products.length === 0) {
          if (!cancelled) {
            setPreviewProducts([]);
            setPreviewProduct(null);
            setPreviewIndex(0);
          }
          return;
        }

        const randomIndex = Math.floor(Math.random() * products.length);
        if (!cancelled) {
          setPreviewProducts(products);
          setPreviewIndex(randomIndex);
          setPreviewProduct(products[randomIndex]);
        }
      } catch {
        if (!cancelled) {
          setPreviewProducts([]);
          setPreviewProduct(null);
          setPreviewIndex(0);
        }
      }
    };

    void loadPreviewProduct();
    window.addEventListener('auth-changed', loadPreviewProduct);

    return () => {
      cancelled = true;
      window.removeEventListener('auth-changed', loadPreviewProduct);
    };
  }, []);

  useEffect(() => {
    if (previewProducts.length <= 1) return;

    const interval = window.setInterval(() => {
      setPreviewIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % previewProducts.length;
        setPreviewProduct(previewProducts[nextIndex]);
        return nextIndex;
      });
    }, PREVIEW_ROTATION_MS);

    return () => window.clearInterval(interval);
  }, [previewProducts]);

  const previewImage = previewProduct?.imageUrls?.[0] || previewProduct?.modelUrl || '';
  const previewPrice = previewProduct?.priceRangeMin ?? previewProduct?.priceRangeMax ?? 0;
  const previewTitle = previewProduct?.name?.trim() || text.previewEmpty;
  const previewCategory = previewProduct?.category?.trim() || '-';
  const previewSeller = previewProduct?.seller?.name?.trim() || '-';

  return (
    <div className="bg-stone-50 text-slate-950">
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,#e7f0dc,transparent_32%),linear-gradient(135deg,#fffaf1_0%,#eef6f0_48%,#f7fbff_100%)]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-sm font-medium text-emerald-900 shadow-sm">
              <Sparkles className="h-4 w-4" />
              {text.badge}
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {text.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">{text.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {text.catalog}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ai-generator"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
              >
                {text.ai}
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {text.stats.map(([value, label]) => (
                <div key={value} className="border-l border-stone-300 pl-4">
                  <p className="text-2xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-sm text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
              <div className="aspect-[4/3] rounded-3xl border border-stone-200 bg-[linear-gradient(145deg,#172033,#31402f)] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-100">{text.preview}</p>
                    <h2 className="mt-1 line-clamp-2 text-2xl font-semibold">{previewTitle}</h2>
                  </div>
                  <Box className="h-9 w-9 text-emerald-200" />
                </div>
                <div className="mt-10 grid grid-cols-3 gap-3">
                  <div className="col-span-2 h-44 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    {previewImage ? (
                      <img src={previewImage} alt={previewTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-200">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm">{text.noImage}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs text-slate-200">{text.category}</p>
                      <p className="mt-1 truncate font-semibold">{previewCategory}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs text-slate-200">{text.price}</p>
                      <p className="mt-1 font-semibold">TL {previewPrice.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs text-slate-200">{text.seller}</p>
                      <p className="mt-1 truncate font-semibold">{previewSeller}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-200" />
                  <p className="text-sm text-slate-100">{text.note}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {text.features.map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <item.icon className="h-7 w-7 text-emerald-700" />
              <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-6 border-t border-stone-200 pt-10 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">{text.popularTitle}</h2>
            <p className="mt-2 max-w-2xl text-slate-600">{text.popularText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {text.categories.map((category) => (
              <Link
                key={category}
                href={`/marketplace?category=${encodeURIComponent(category.toLowerCase())}`}
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:text-emerald-800"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
