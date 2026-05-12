'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Clock3,
  ImageIcon,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Wand2,
} from 'lucide-react';

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-100 text-xs text-slate-500">
      Onizleme hazirlaniyor...
    </div>
  ),
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

const fallbackCategories = [
  { value: 'art', label: 'Sanat ve dekor' },
  { value: 'functional', label: 'Fonksiyonel parca' },
  { value: 'mechanical', label: 'Mekanik parca' },
  { value: 'figurine', label: 'Figur' },
];

export default function MarketplaceCatalog({ models }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [catalogModels, setCatalogModels] = useState(models);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  useEffect(() => {
    setCatalogModels(models);
  }, [models]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    try {
      setUser(JSON.parse(raw) as StoredUser);
    } catch {
      setUser(null);
    }
  }, []);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    catalogModels.forEach((model) => {
      if (model.category) unique.set(model.category, model.categoryLabel || model.category);
    });
    const items = Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
    return items.length > 0 ? items : fallbackCategories;
  }, [catalogModels]);

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    const priceLimit = Number(maxPrice);

    return catalogModels.filter((model) => {
      const matchesQuery =
        !normalizedQuery ||
        model.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        model.description.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        model.seller.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery);
      const matchesCategory = category === 'all' || model.category === category;
      const matchesPrice = !Number.isFinite(priceLimit) || priceLimit <= 0 || model.price <= priceLimit;
      return matchesQuery && matchesCategory && matchesPrice;
    });
  }, [catalogModels, category, maxPrice, query]);

  const handleMessage = (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    router.push(`/chat/new?modelId=${encodeURIComponent(id)}&type=CATALOG`);
  };

  const handleOrder = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token || orderingId) {
      if (!token) router.push('/login');
      return;
    }

    setOrderingId(id);
    try {
      const response = await fetch('/api/chat/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modelId: id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Siparis olusturulamadi.');
      }

      router.push('/orders');
    } catch (error: any) {
      window.alert(error.message || 'Siparis olusturulamadi.');
    } finally {
      setOrderingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token || deletingId) {
      if (!token) router.push('/login');
      return;
    }

    const confirmed = window.confirm('Bu urunu katalogdan kaldirmak istiyor musunuz?');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Urun kaldirilamadi.');
      }

      setCatalogModels((items) => items.filter((item) => item.id !== id));
    } catch (error: any) {
      window.alert(error.message || 'Urun kaldirilamadi.');
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
                Dogrulanmis 3D baski pazaryeri
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Uretime hazir urunleri kesfet, sabit fiyatla saticiya ulas.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                Katalogdaki urunleri filtreleyin, gorsellerle inceleyin ve sabit fiyat bilgisini net sekilde gorun.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {user?.role === 'SELLER' ? (
                  <Link
                    href="/seller/add-product"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Yeni urun ekle
                  </Link>
                ) : (
                  <Link
                    href="/ai-generator"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Wand2 className="h-4 w-4" />
                    AI ile model olustur
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-500 hover:text-emerald-800"
                >
                  Katalogu incele
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
              <div className="grid grid-cols-3 gap-3">
                <Metric value={catalogModels.length.toString()} label="aktif urun" />
                <Metric value={categories.length.toString()} label="kategori" />
                <Metric value="Sabit" label="fiyat modeli" />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-700" />
                  Satici bilgisi ve tek fiyat kartlarda gorunur.
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <MessageSquare className="h-5 w-5 text-emerald-700" />
                  Pazarlik yerine net fiyat ve mesaj akisi kullanilir.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Filtreler</h2>
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950">
              Temizle
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Arama</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Model veya satici ara"
                  className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Kategori</span>
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">Tum kategoriler</option>
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Maksimum fiyat</span>
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                type="number"
                min={1}
                placeholder="Orn. 1000"
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white">
            <Clock3 className="h-5 w-5 text-emerald-200" />
            <p className="mt-3 text-sm font-semibold">Net fiyat akisi</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Urunu secin, saticiya notunuzu iletin, teslim detayini sohbetten takip edin.
            </p>
          </div>
        </aside>

        <section id="catalog-results" className="min-w-0">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Katalog sonuclari</h2>
              <p className="mt-1 text-sm text-slate-600">
                {filteredModels.length} model gosteriliyor
              </p>
            </div>
            {user?.role === 'SELLER' && (
              <Link
                href="/seller/add-product"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-500 hover:text-emerald-800"
              >
                <Plus className="h-4 w-4" />
                Urun ekle
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
                    <ProductMedia model={model} />
                    {model.categoryLabel ? (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {model.categoryLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-h-[260px] flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">{model.name}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{model.description}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                        {model.seller.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{model.seller.name}</p>
                        <p className="text-xs text-slate-500">Dogrulanmis satici</p>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xl font-bold text-slate-950">
                        TL {model.price.toLocaleString('tr-TR')}
                      </span>
                      {user?.id === model.seller.id && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(model.id)}
                          disabled={deletingId === model.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === model.id ? 'Kaldiriliyor' : 'Kaldir'}
                        </button>
                      )}
                      {user?.id !== model.seller.id && (
                        <button
                          type="button"
                          onClick={() => void handleOrder(model.id)}
                          disabled={orderingId === model.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {orderingId === model.id ? 'Aliniyor' : 'Satin al'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMessage(model.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Saticiya yaz
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
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

function ProductMedia({ model }: { model: CatalogModel }) {
  const images = model.imageUrls?.filter(Boolean) ?? [];

  if (images.length > 0) {
    return (
      <div className="h-full w-full">
        <img
          src={images[0]}
          alt={model.name}
          className="h-full w-full object-cover"
        />
        {images.length > 1 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            <ImageIcon className="h-3.5 w-3.5" />
            {images.length} gorsel
          </span>
        ) : null}
      </div>
    );
  }

  if (model.modelUrl) {
    return <ModelViewer src={model.modelUrl} className="h-full w-full" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm font-medium text-slate-500">
      Gorsel yok
    </div>
  );
}

function EmptyCatalog({ isSeller }: { isSeller: boolean }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="grid min-h-[420px] lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Box className="h-9 w-9" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-950">Katalog henuz bos</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Bu alan, urunler eklendikce profesyonel model kartlariyla dolacak. Simdilik ilk urunu ekleyebilir veya AI ile yeni bir model fikri olusturabilirsiniz.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isSeller ? (
              <Link
                href="/seller/add-product"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Ilk urunu ekle
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Store className="h-4 w-4" />
                Satici olarak katil
              </Link>
            )}
            <Link
              href="/ai-generator"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-800"
            >
              <Sparkles className="h-4 w-4" />
              AI ile model olustur
            </Link>
          </div>
        </div>

        <div className="border-t border-stone-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold text-emerald-200">Katalog nasil dolacak?</p>
          <div className="mt-6 space-y-5">
            {[
              ['1', 'Satici urun gorsellerini yukler.'],
              ['2', 'Urun karti tek fiyat ve kategoriyle yayina cikar.'],
              ['3', 'Musteri sabit fiyati gorup saticiya mesaj atar.'],
            ].map(([step, text]) => (
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
