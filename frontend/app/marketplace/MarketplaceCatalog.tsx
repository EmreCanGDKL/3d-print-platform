'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  ImageIcon,
  MessageSquare,
  Plus,
  Send,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { addToCart } from '@/lib/cart';
import { getFavoriteIds, toggleFavorite } from '@/lib/favorites';
import { useLanguage } from '@/lib/language';

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => <ModelPreviewLoading />,
});

export type CatalogModel = {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  modelUrl: string;
  imageUrls: string[];
  price: number;
  priceRangeMin: number;
  priceRangeMax: number;
  ratingAverage: number;
  ratingCount: number;
  seller: {
    id: string;
    name: string;
  };
};

type StoredUser = {
  id: string;
  name: string;
  role: 'USER' | 'SELLER';
};

interface Props {
  models: CatalogModel[];
}

const copy = {
  tr: {
    previewLoading: 'Önizleme hazırlanıyor...',
    fallbackCategories: [
      { value: 'art', label: 'Sanat ve dekor' },
      { value: 'functional', label: 'Fonksiyonel parça' },
      { value: 'mechanical', label: 'Mekanik parça' },
      { value: 'figurine', label: 'Figür' },
    ],
    added: 'Ürün sepete eklendi.',
    incremented: 'Sepetteki ürün adedi artırıldı.',
    confirmDelete: 'Bu ürünü katalogdan kaldırmak istiyor musunuz?',
    deleteFailed: 'Ürün kaldırılamadı.',
    badge: 'Doğrulanmış 3D baskı pazaryeri',
    heroTitle: 'Üretime hazır ürünleri keşfet, sabit fiyatla satıcıya ulaş.',
    heroText: 'Katalogdaki ürünleri filtreleyin, görsellerle inceleyin ve sabit fiyat bilgisini net şekilde görün.',
    addNew: 'Yeni ürün ekle',
    createAi: 'AI ile model oluştur',
    browse: 'Kataloğu incele',
    activeProducts: 'aktif ürün',
    category: 'kategori',
    priceModel: 'fiyat modeli',
    fixed: 'Sabit',
    sellerVisible: 'Satıcı bilgisi ve tek fiyat kartlarda görünür.',
    fixedFlow: 'Pazarlık yerine net fiyat ve mesaj akışı kullanılır.',
    filters: 'Filtreler',
    clear: 'Temizle',
    search: 'Arama',
    searchPlaceholder: 'Model veya satıcı ara',
    categoryLabel: 'Kategori',
    allCategories: 'Tüm kategoriler',
    maxPrice: 'Maksimum fiyat',
    pricePlaceholder: 'Örn. 1000',
    flowTitle: 'Net fiyat akışı',
    flowText: 'Ürünü seçin, satıcıya notunuzu iletin, teslim detayını sohbetten takip edin.',
    results: 'Katalog sonuçları',
    showing: 'model gösteriliyor',
    addProduct: 'Ürün ekle',
    reviewsQuestions: 'Yorumlar ve sorular',
    verifiedSeller: 'Doğrulanmış satıcı',
    removing: 'Kaldırılıyor',
    remove: 'Kaldır',
    addToCart: 'Sepete ekle',
    messageSeller: 'Satıcıya yaz',
    addFavorite: 'Favorilere ekle',
    removeFavorite: 'Favorilerden kaldır',
    favoriteAdded: 'Ürün favorilere eklendi.',
    favoriteRemoved: 'Ürün favorilerden kaldırıldı.',
    pricePrefix: 'TL',
    noImage: 'Görsel yok',
    images: 'görsel',
    gallery: 'Ürün görselleri',
    previousImage: 'Önceki görsel',
    nextImage: 'Sonraki görsel',
    openGallery: 'Ürün görsellerini aç',
  },
  en: {
    previewLoading: 'Preparing preview...',
    fallbackCategories: [
      { value: 'art', label: 'Art and decor' },
      { value: 'functional', label: 'Functional part' },
      { value: 'mechanical', label: 'Mechanical part' },
      { value: 'figurine', label: 'Figure' },
    ],
    added: 'Product added to cart.',
    incremented: 'Product quantity in cart was increased.',
    confirmDelete: 'Do you want to remove this product from the catalog?',
    deleteFailed: 'Product could not be removed.',
    badge: 'Verified 3D printing marketplace',
    heroTitle: 'Discover production-ready products and reach sellers at fixed prices.',
    heroText: 'Filter catalog products, review images, and see fixed pricing clearly.',
    addNew: 'Add new product',
    createAi: 'Create with AI',
    browse: 'Browse catalog',
    activeProducts: 'active products',
    category: 'categories',
    priceModel: 'pricing model',
    fixed: 'Fixed',
    sellerVisible: 'Seller information and one fixed price are visible on each card.',
    fixedFlow: 'Use a clear price and message flow instead of negotiation.',
    filters: 'Filters',
    clear: 'Clear',
    search: 'Search',
    searchPlaceholder: 'Search model or seller',
    categoryLabel: 'Category',
    allCategories: 'All categories',
    maxPrice: 'Maximum price',
    pricePlaceholder: 'Ex. 1000',
    flowTitle: 'Clear price flow',
    flowText: 'Select a product, send your note to the seller, and follow delivery details in chat.',
    results: 'Catalog results',
    showing: 'models shown',
    addProduct: 'Add product',
    reviewsQuestions: 'Reviews and questions',
    verifiedSeller: 'Verified seller',
    removing: 'Removing',
    remove: 'Remove',
    addToCart: 'Add to cart',
    messageSeller: 'Message seller',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    favoriteAdded: 'Product added to favorites.',
    favoriteRemoved: 'Product removed from favorites.',
    pricePrefix: 'TL',
    noImage: 'No image',
    images: 'images',
    gallery: 'Product images',
    previousImage: 'Previous image',
    nextImage: 'Next image',
    openGallery: 'Open product images',
  },
};

export default function MarketplaceCatalog({ models }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const text = copy[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [catalogModels, setCatalogModels] = useState(models);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailModelId, setDetailModelId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCatalogModels(models);
  }, [models]);

  useEffect(() => {
    const requestedModelId = searchParams.get('modelId');
    if (requestedModelId && models.some((model) => model.id === requestedModelId)) {
      setDetailModelId(requestedModelId);
    }
  }, [models, searchParams]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    try {
      setUser(JSON.parse(raw) as StoredUser);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
  }, []);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    catalogModels.forEach((model) => {
      if (model.category) unique.set(model.category, model.categoryLabel || model.category);
    });
    const items = Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
    return items.length > 0 ? items : text.fallbackCategories;
  }, [catalogModels, text.fallbackCategories]);

  const filteredModels = useMemo(() => {
      const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    const priceLimit = Number(maxPrice);

    return catalogModels.filter((model) => {
      const matchesQuery =
        !normalizedQuery ||
        model.name.toLocaleLowerCase(locale).includes(normalizedQuery) ||
        model.description.toLocaleLowerCase(locale).includes(normalizedQuery) ||
        model.seller.name.toLocaleLowerCase(locale).includes(normalizedQuery);
      const matchesCategory = category === 'all' || model.category === category;
      const matchesPrice = !Number.isFinite(priceLimit) || priceLimit <= 0 || model.price <= priceLimit;
      return matchesQuery && matchesCategory && matchesPrice;
    });
  }, [catalogModels, category, maxPrice, locale, query]);

  const handleMessage = (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    router.push(`/chat/new?modelId=${encodeURIComponent(id)}&type=CATALOG`);
  };

  const handleAddToCart = (model: CatalogModel) => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (!token) router.push('/login');
      return;
    }

    const result = addToCart({
      id: model.id,
      name: model.name,
      description: model.description,
      price: model.price,
      imageUrl: model.imageUrls[0] || model.modelUrl || '',
      quantity: 1,
      seller: model.seller,
    });

    window.alert(result.added ? text.added : text.incremented);
  };

  const handleToggleFavorite = (model: CatalogModel) => {
    const added = toggleFavorite({
      id: model.id,
      name: model.name,
      description: model.description,
      price: model.price,
      imageUrl: model.imageUrls[0] || model.modelUrl || '',
      seller: model.seller,
      categoryLabel: model.categoryLabel,
    });

    setFavoriteIds(getFavoriteIds());
    window.alert(added ? text.favoriteAdded : text.favoriteRemoved);
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token || deletingId) {
      if (!token) router.push('/login');
      return;
    }

    const confirmed = window.confirm(text.confirmDelete);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(apiUrl(`/api/models/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || text.deleteFailed);
      }

      setCatalogModels((items) => items.filter((item) => item.id !== id));
    } catch (error: any) {
      window.alert(error.message || text.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setMaxPrice('');
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-950">
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_15%_10%,#dff7e8,transparent_32%),linear-gradient(135deg,#fffaf0_0%,#f7fbf7_52%,#eef7ff_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-sm font-semibold text-emerald-900 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                {text.badge}
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {text.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                {text.heroText}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {user?.role === 'SELLER' ? (
                  <Link
                    href="/seller/add-product"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    {text.addNew}
                  </Link>
                ) : (
                  <Link
                    href="/ai-generator"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Wand2 className="h-4 w-4" />
                    {text.createAi}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-500 hover:text-emerald-800"
                >
                  {text.browse}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
              <div className="grid grid-cols-3 gap-3">
                <Metric value={catalogModels.length.toString()} label={text.activeProducts} />
                <Metric value={categories.length.toString()} label={text.category} />
                <Metric value={text.fixed} label={text.priceModel} />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-700" />
                  {text.sellerVisible}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <MessageSquare className="h-5 w-5 text-emerald-700" />
                  {text.fixedFlow}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{text.filters}</h2>
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950">
              {text.clear}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{text.search}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={text.searchPlaceholder}
                  className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{text.categoryLabel}</span>
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">{text.allCategories}</option>
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{text.maxPrice}</span>
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                type="number"
                min={1}
                placeholder={text.pricePlaceholder}
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white">
            <Clock3 className="h-5 w-5 text-emerald-200" />
            <p className="mt-3 text-sm font-semibold">{text.flowTitle}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {text.flowText}
            </p>
          </div>
        </aside>

        <section id="catalog-results" className="min-w-0">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">{text.results}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {filteredModels.length} {text.showing}
              </p>
            </div>
            {user?.role === 'SELLER' && (
              <Link
                href="/seller/add-product"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-500 hover:text-emerald-800"
              >
                <Plus className="h-4 w-4" />
                {text.addProduct}
              </Link>
            )}
          </div>

          {filteredModels.length === 0 ? (
            <EmptyCatalog isSeller={user?.role === 'SELLER'} />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredModels.map((model) => (
                <article
                  key={model.id}
                  className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[220px_1fr]"
                >
                  <div className="relative h-56 bg-stone-100 md:h-full">
                    <button
                      type="button"
                      onClick={() => setDetailModelId(model.id)}
                      className="block h-full w-full text-left"
                      aria-label={text.openGallery}
                    >
                      <ProductMedia model={model} />
                    </button>
                    {model.categoryLabel ? (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {model.categoryLabel}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(model)}
                      className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition hover:text-red-600"
                      aria-label={favoriteIds.has(model.id) ? text.removeFavorite : text.addFavorite}
                      title={favoriteIds.has(model.id) ? text.removeFavorite : text.addFavorite}
                    >
                      <Heart className={`h-5 w-5 ${favoriteIds.has(model.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                  <div className="flex min-h-[260px] flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">{model.name}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{model.description}</p>
                        <button
                          type="button"
                          onClick={() => setDetailModelId(model.id)}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                        >
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {model.ratingCount > 0
                            ? `${model.ratingAverage.toLocaleString(locale)} (${model.ratingCount} ${language === 'tr' ? 'yorum' : 'reviews'})`
                            : text.reviewsQuestions}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                        {model.seller.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{model.seller.name}</p>
                        <p className="text-xs text-slate-500">{text.verifiedSeller}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xl font-bold text-slate-950">
                        {text.pricePrefix} {model.price.toLocaleString(locale)}
                      </span>
                      {user?.id === model.seller.id && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(model.id)}
                          disabled={deletingId === model.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === model.id ? text.removing : text.remove}
                        </button>
                      )}
                      {user?.id !== model.seller.id && (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(model)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {text.addToCart}
                        </button>
                      )}
                      {user?.id !== model.seller.id && (
                        <button
                          type="button"
                          onClick={() => handleMessage(model.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {text.messageSeller}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      {detailModelId && (
        <ProductDetailModal
          modelId={detailModelId}
          currentUser={user}
          onClose={() => setDetailModelId(null)}
        />
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ModelPreviewLoading() {
  const { language } = useLanguage();
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-100 text-xs text-slate-500">
      {copy[language].previewLoading}
    </div>
  );
}

type ProductDetail = {
  id: string;
  name: string | null;
  description: string | null;
  price: number;
  imageUrls: string[];
  ratingAverage: number;
  ratingCount: number;
  seller: {
    id: string;
    name: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    user: { id: string; name: string };
  }>;
  questions: Array<{
    id: string;
    question: string;
    answer?: string | null;
    createdAt: string;
    user: { id: string; name: string };
    answerUser?: { id: string; name: string } | null;
  }>;
};

function ProductDetailModal({
  modelId,
  currentUser,
  onClose,
}: {
  modelId: string;
  currentUser: StoredUser | null;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const modalText = {
    tr: {
      loadFailed: 'Ürün detayı alınamadı.',
      titleFallback: 'Ürün detayı',
      loading: 'Ürün detayı yükleniyor...',
      productAlt: 'Ürün',
      noImage: 'Görsel yok',
      new: 'Yeni',
      reviews: 'yorum',
      qa: 'Soru ve cevaplar',
      askPlaceholder: 'Ürün hakkında soru sorun',
      ask: 'Sor',
      noQuestions: 'Henüz soru yok.',
      question: 'Soru',
      sellerAnswer: 'Satıcı cevabı',
      answerPlaceholder: 'Cevap yazın',
      answer: 'Cevapla',
      unanswered: 'Satıcı henüz cevaplamadı.',
      ratings: 'Yorumlar ve puan',
      commentPlaceholder: 'Yorumunuzu yazın',
      saveReview: 'Yorumu kaydet',
      noReviews: 'Henüz yorum yok.',
      openFailed: 'Ürün detayı açılamadı.',
      questionFailed: 'Soru kaydedilemedi.',
      reviewFailed: 'Yorum kaydedilemedi.',
      answerFailed: 'Cevap kaydedilemedi.',
    },
    en: {
      loadFailed: 'Product details could not be loaded.',
      titleFallback: 'Product details',
      loading: 'Loading product details...',
      productAlt: 'Product',
      noImage: 'No image',
      new: 'New',
      reviews: 'reviews',
      qa: 'Questions and answers',
      askPlaceholder: 'Ask a question about the product',
      ask: 'Ask',
      noQuestions: 'No questions yet.',
      question: 'Question',
      sellerAnswer: 'Seller answer',
      answerPlaceholder: 'Write an answer',
      answer: 'Answer',
      unanswered: 'The seller has not answered yet.',
      ratings: 'Reviews and rating',
      commentPlaceholder: 'Write your review',
      saveReview: 'Save review',
      noReviews: 'No reviews yet.',
      openFailed: 'Product details could not be opened.',
      questionFailed: 'Question could not be saved.',
      reviewFailed: 'Review could not be saved.',
      answerFailed: 'Answer could not be saved.',
    },
  }[language];
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loadDetail = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl(`/api/models/${modelId}/details`), { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || modalText.loadFailed);
      setDetail(data);
      setCurrentImageIndex(0);
    } catch (err: any) {
      setError(err.message || modalText.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const token = typeof window === 'undefined' ? null : localStorage.getItem('token');
  const isSeller = Boolean(currentUser && detail?.seller.id === currentUser.id);

  const submitQuestion = async () => {
    if (!token || !question.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/api/models/${modelId}/questions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || modalText.questionFailed);
      setQuestion('');
      await loadDetail();
    } catch (err: any) {
      setError(err.message || modalText.questionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (!token || !comment.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/api/models/${modelId}/reviews`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || modalText.reviewFailed);
      setComment('');
      setRating(5);
      await loadDetail();
    } catch (err: any) {
      setError(err.message || modalText.reviewFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const submitAnswer = async (questionId: string) => {
    const answer = answerDrafts[questionId]?.trim();
    if (!token || !answer || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/api/models/${modelId}/questions/${questionId}/answer`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || modalText.answerFailed);
      setAnswerDrafts((items) => ({ ...items, [questionId]: '' }));
      await loadDetail();
    } catch (err: any) {
      setError(err.message || modalText.answerFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const images = detail?.imageUrls.filter(Boolean) ?? [];
  const selectedImage = images[currentImageIndex] || images[0] || '';
  const hasMultipleImages = images.length > 1;
  const showPreviousImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((index) => (index - 1 + images.length) % images.length);
  };
  const showNextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((index) => (index + 1) % images.length);
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/50 p-4">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{detail?.name || modalText.titleFallback}</h2>
            {detail && (
              <p className="mt-1 text-sm text-slate-600">
                TL {detail.price.toLocaleString('tr-TR')} - {detail.seller.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-slate-700 hover:bg-stone-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-sm font-semibold text-slate-600">{modalText.loading}</div>
        ) : detail ? (
          <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr]">
            <div>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                {selectedImage ? (
                  <div className="relative">
                    <img src={selectedImage} alt={detail.name || modalText.productAlt} className="aspect-square w-full object-cover" />
                    {hasMultipleImages && (
                      <>
                        <button
                          type="button"
                          onClick={showPreviousImage}
                          className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
                          aria-label={copy[language].previousImage}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={showNextImage}
                          className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
                          aria-label={copy[language].nextImage}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">
                          {currentImageIndex + 1}/{images.length}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center text-sm text-slate-500">{modalText.noImage}</div>
                )}
              </div>
              {images.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{copy[language].gallery}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`overflow-hidden rounded-xl border transition ${
                          index === currentImageIndex ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-stone-200'
                        }`}
                        aria-label={`${copy[language].gallery} ${index + 1}`}
                      >
                        <img src={image} alt="" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-xl font-bold text-slate-950">
                    {detail.ratingCount > 0 ? detail.ratingAverage.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US') : modalText.new}
                  </span>
                  <span className="text-sm text-slate-600">{detail.ratingCount} {modalText.reviews}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

              <section>
                <h3 className="text-base font-bold text-slate-950">{modalText.qa}</h3>
                {token && !isSeller && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder={modalText.askPlaceholder}
                      className="h-11 flex-1 rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => void submitQuestion()}
                      disabled={!question.trim() || submitting}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {modalText.ask}
                    </button>
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  {detail.questions.length === 0 ? (
                    <p className="rounded-xl bg-stone-50 p-4 text-sm text-slate-600">{modalText.noQuestions}</p>
                  ) : (
                    detail.questions.map((item) => (
                      <div key={item.id} className="rounded-xl border border-stone-200 p-4">
                        <p className="text-sm font-semibold text-slate-950">{modalText.question}: {item.question}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.user.name}</p>
                        {item.answer ? (
                          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
                            <span className="font-bold">{modalText.sellerAnswer}:</span> {item.answer}
                          </div>
                        ) : isSeller ? (
                          <div className="mt-3 flex gap-2">
                            <input
                              value={answerDrafts[item.id] || ''}
                              onChange={(event) => setAnswerDrafts((items) => ({ ...items, [item.id]: event.target.value }))}
                              placeholder={modalText.answerPlaceholder}
                              className="h-10 flex-1 rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                            <button
                              type="button"
                              onClick={() => void submitAnswer(item.id)}
                              disabled={!answerDrafts[item.id]?.trim() || submitting}
                              className="rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {modalText.answer}
                            </button>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">{modalText.unanswered}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold text-slate-950">{modalText.ratings}</h3>
                {token && !isSeller && (
                  <div className="mt-3 rounded-xl border border-stone-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className="text-amber-400"
                          aria-label={`${value} puan`}
                        >
                          <Star className={`h-6 w-6 ${value <= rating ? 'fill-amber-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder={modalText.commentPlaceholder}
                      rows={3}
                      className="mt-3 w-full rounded-xl border border-stone-300 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => void submitReview()}
                      disabled={!comment.trim() || submitting}
                      className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {modalText.saveReview}
                    </button>
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  {detail.reviews.length === 0 ? (
                    <p className="rounded-xl bg-stone-50 p-4 text-sm text-slate-600">{modalText.noReviews}</p>
                  ) : (
                    detail.reviews.map((review) => (
                      <div key={review.id} className="rounded-xl border border-stone-200 p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-950">{review.user.name}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {review.rating}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="p-8 text-sm text-red-700">{modalText.openFailed}</div>
        )}
      </div>
    </div>
  );
}

function ProductMedia({ model }: { model: CatalogModel }) {
  const { language } = useLanguage();
  const text = copy[language];
  const images = model.imageUrls?.filter(Boolean) ?? [];
  const primaryImage = images[0] || '';
  const [imageFailed, setImageFailed] = useState(false);

  if (images.length > 0 && !imageFailed) {
    return (
      <div className="h-full w-full">
        <img
          src={images[0]}
          alt={model.name}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
        {images.length > 1 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            <ImageIcon className="h-3.5 w-3.5" />
            {images.length} {text.images}
          </span>
        ) : null}
      </div>
    );
  }

  const canUseModelPreview =
    model.modelUrl &&
    model.modelUrl !== primaryImage &&
    /\.(glb|gltf|stl)(\?|$)/i.test(model.modelUrl);

  if (canUseModelPreview) {
    return <ModelViewer src={model.modelUrl} className="h-full w-full" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm font-medium text-slate-500">
      {text.noImage}
    </div>
  );
}

function EmptyCatalog({ isSeller }: { isSeller: boolean }) {
  const { language } = useLanguage();
  const empty = {
    tr: {
      title: 'Katalog henüz boş',
      text: 'Bu alan, ürünler eklendikçe profesyonel model kartlarıyla dolacak. Şimdilik ilk ürünü ekleyebilir veya AI ile yeni bir model fikri oluşturabilirsiniz.',
      firstProduct: 'İlk ürünü ekle',
      joinSeller: 'Satıcı olarak katıl',
      createAi: 'AI ile model oluştur',
      how: 'Katalog nasıl dolacak?',
      steps: [
        ['1', 'Satıcı ürün görsellerini yükler.'],
        ['2', 'Ürün kartı tek fiyat ve kategoriyle yayına çıkar.'],
        ['3', 'Müşteri sabit fiyatı görüp satıcıya mesaj atar.'],
      ],
    },
    en: {
      title: 'The catalog is empty',
      text: 'This area will fill with professional model cards as products are added. You can add the first product or create a new model idea with AI.',
      firstProduct: 'Add first product',
      joinSeller: 'Join as seller',
      createAi: 'Create with AI',
      how: 'How will the catalog fill up?',
      steps: [
        ['1', 'The seller uploads product images.'],
        ['2', 'The product card goes live with one fixed price and a category.'],
        ['3', 'The customer sees the fixed price and messages the seller.'],
      ],
    },
  }[language];

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="grid min-h-[420px] lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Box className="h-9 w-9" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-950">{empty.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            {empty.text}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isSeller ? (
              <Link
                href="/seller/add-product"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {empty.firstProduct}
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Store className="h-4 w-4" />
                {empty.joinSeller}
              </Link>
            )}
            <Link
              href="/ai-generator"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-800"
            >
              <Sparkles className="h-4 w-4" />
              {empty.createAi}
            </Link>
          </div>
        </div>

        <div className="border-t border-stone-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold text-emerald-200">{empty.how}</p>
          <div className="mt-6 space-y-5">
            {empty.steps.map(([step, text]) => (
              <div key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                  {step}
                </span>
                <p className="text-sm leading-6 text-slate-200">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
