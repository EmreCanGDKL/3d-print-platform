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
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
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
    models.forEach((model) => {
      if (model.category) unique.set(model.category, model.categoryLabel || model.category);
    });
    const items = Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
    return items.length > 0 ? items : fallbackCategories;
  }, [models]);

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    const priceLimit = Number(maxPrice);

    return models.filter((model) => {
      const matchesQuery =
        !normalizedQuery ||
        model.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        model.description.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        model.seller.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery);
      const matchesCategory = category === 'all' || model.category === category;
      const matchesPrice = !Number.isFinite(priceLimit) || priceLimit <= 0 || model.priceRangeMin <= priceLimit;
      return matchesQuery && matchesCategory && matchesPrice;
    });
  }, [category, maxPrice, models, query]);

  const handleQuote = (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    router.push(`/chat/new?modelId=${encodeURIComponent(id)}&type=CATALOG`);
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
                Uretime hazir modelleri kesfet, saticidan hizli teklif al.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                Katalogdaki 3D modelleri filtreleyin, onizlemeyle inceleyin ve ihtiyaciniza uygun uretim teklifini tek ekrandan baslatin.
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
                <Metric value={models.length.toString()} label="aktif urun" />
                <Metric value={categories.length.toString()} label="kategori" />
                <Metric value="48s" label="teklif hedefi" />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-700" />
                  Satici bilgisi ve fiyat araligi kartlarda gorunur.
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <MessageSquare className="h-5 w-5 text-emerald-700" />
                  Teklif sureci dogrudan sohbet akisi ile baslar.
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
            <p className="mt-3 text-sm font-semibold">Profesyonel teklif akisi</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Modeli secin, saticiya notunuzu iletin, fiyat ve teslim detayini sohbetten takip edin.
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
                    <ModelViewer src={model.modelUrl} className="h-full w-full" />
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
                        TL {model.priceRangeMin.toLocaleString('tr-TR')}
                        {model.priceRangeMax !== model.priceRangeMin
                          ? ` - TL ${model.priceRangeMax.toLocaleString('tr-TR')}`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuote(model.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Teklif al
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
              ['1', 'Satici GLB/GLTF modelini yukler.'],
              ['2', 'Model karti fiyat araligi ve kategoriyle yayina cikar.'],
              ['3', 'Musteri teklif alarak sohbeti baslatir.'],
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
