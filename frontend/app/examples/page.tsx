'use client';

import Link from 'next/link';
import { AlertCircle, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExampleImageCard, ExampleImageCardData } from '@/components/ExampleImageCard';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

type ExampleItem = {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  prompt: string;
  tags: string[];
};

type GoogleImageItem = {
  id: string;
  title: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  thumbnailUrl?: string;
};

type StoredUser = {
  role?: string;
};

type UserResponse = {
  user?: StoredUser;
};

const popularTags = ['figür', 'vazo', 'telefon standı', 'cosplay kaskı', 'masaüstü organizer', 'mimari maket'];

const copy = {
  tr: {
    eyebrow: 'Örnekler / Hızlı Başlat',
    title: 'Bir fikir seçin, AI üretime hazır gelsin.',
    description: 'Hazır örneklerden seçim yapın veya internet görsel aramasıyla yeni bir 3D baskı fikri bulun.',
    placeholder: '3D baskı fikri ara: figür, vazo, cosplay kaskı...',
    clearSearch: 'Aramayı temizle',
    popular: 'Popüler aramalar',
    adminSection: 'Admin örnekleri',
    searchSection: 'Görsel sonuçları',
    searching: 'Görseller aranıyor...',
    convert: 'AI ile 3D’ye dönüştür',
    fallback: 'Görsel yüklenemedi',
    loading: 'Örnekler yükleniyor...',
    emptyTitle: 'Henüz örnek eklenmedi',
    emptyText: 'Admin panelinden internet görseli veya lokal görsel bağlantısı eklenince burada görünür.',
    emptySearchTitle: 'Bu arama için sonuç bulunamadı',
    emptySearchText: 'Daha kısa veya farklı bir 3D baskı fikriyle tekrar deneyin.',
    manage: 'Örnek ekle',
    apiFallback: 'Örnekler alınamadı. Backend bağlantısını kontrol edin.',
    searchFallback: 'Görsel arama şu anda tamamlanamadı. Lütfen tekrar deneyin.',
  },
  en: {
    eyebrow: 'Examples / Quick Start',
    title: 'Pick an idea and start AI generation faster.',
    description: 'Choose a ready example or find a new 3D printing idea with Google image search.',
    placeholder: 'Search a 3D printing idea: figurine, vase, cosplay helmet...',
    clearSearch: 'Clear search',
    popular: 'Popular searches',
    adminSection: 'Admin examples',
    searchSection: 'Google image results',
    searching: 'Searching images...',
    convert: 'Convert to 3D with AI',
    fallback: 'Image could not load',
    loading: 'Loading examples...',
    emptyTitle: 'No examples yet',
    emptyText: 'Examples will appear here after the admin adds an internet or local image URL.',
    emptySearchTitle: 'No results found',
    emptySearchText: 'Try again with a shorter or different 3D printing idea.',
    manage: 'Add example',
    apiFallback: 'Examples could not be loaded. Check the backend connection.',
    searchFallback: 'Image search could not be completed right now. Please try again.',
  },
};

function sanitizeSearchInput(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F<>`"{}\\^|[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function buildPrompt(title: string, query: string) {
  return `Bu referans görsele benzer, 3D baskıya uygun, temiz yüzeyli, STL/3MF üretimine uygun bir 3D model oluştur: ${title}. Arama konusu: ${query}.`;
}

function buildAiHref(item: { title: string; imageUrl: string; source: string }, prompt: string, query: string) {
  const params = new URLSearchParams({
    imageUrl: item.imageUrl,
    prompt,
    title: item.title,
    source: item.source,
    query,
  });

  return `/ai-create?${params.toString()}`;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="min-h-[360px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="aspect-square animate-pulse bg-stone-200" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-4/5 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-stone-200" />
            <div className="h-10 animate-pulse rounded-xl bg-stone-200" />
            <div className="h-10 animate-pulse rounded-xl bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
      <img
        src="/printforge-mark.svg"
        alt=""
        width={72}
        height={72}
        className="mx-auto h-16 w-16 rounded-2xl shadow-sm"
      />
      <h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function ExamplesPage() {
  const { language } = useLanguage();
  const text = copy[language];
  const [adminItems, setAdminItems] = useState<ExampleItem[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchItems, setSearchItems] = useState<GoogleImageItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchCacheRef = useRef(new Map<string, GoogleImageItem[]>());

  const normalizedInput = searchInput.trim();
  const searchMode = normalizedInput.length > 0;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const syncUser = async () => {
      try {
        const response = await fetchWithTimeout('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readJsonResponse<UserResponse>(response, text.apiFallback);
        if (!response.ok || !data.user) return;
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-changed'));
        setIsAdmin(data.user.role === 'ADMIN');
      } catch {
        setIsAdmin(false);
      }
    };

    void syncUser();
  }, [text.apiFallback]);

  useEffect(() => {
    const loadExamples = async () => {
      try {
        setAdminLoading(true);
        setAdminError('');
        const response = await fetchWithTimeout('/api/examples');
        const data = await readJsonResponse<{ items?: ExampleItem[]; error?: string }>(response, text.apiFallback);
        if (!response.ok) throw new Error(data.error || text.apiFallback);
        setAdminItems(data.items || []);
      } catch (err: any) {
        setAdminError(err.name === 'AbortError' ? text.apiFallback : err.message || text.apiFallback);
      } finally {
        setAdminLoading(false);
      }
    };

    void loadExamples();
  }, [text.apiFallback]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(sanitizeSearchInput(searchInput).trim());
    }, 500);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchItems([]);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    const cacheKey = debouncedQuery.toLocaleLowerCase('tr-TR');
    const cachedItems = searchCacheRef.current.get(cacheKey);
    if (cachedItems) {
      setSearchItems(cachedItems);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();

    const searchImages = async () => {
      try {
        setSearchLoading(true);
        setSearchError('');
        const response = await fetchWithTimeout(
          `/api/images/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal },
          15000,
        );
        const data = await readJsonResponse<{ query?: string; items?: GoogleImageItem[]; error?: string }>(
          response,
          text.searchFallback,
        );
        if (!response.ok) throw new Error(data.error || text.searchFallback);
        const items = data.items || [];
        searchCacheRef.current.set(cacheKey, items);
        setSearchItems(items);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setSearchItems([]);
        setSearchError(err.message || text.searchFallback);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    };

    void searchImages();

    return () => controller.abort();
  }, [debouncedQuery, text.searchFallback]);

  const adminCards = useMemo<ExampleImageCardData[]>(
    () =>
      adminItems.map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        source: item.category,
        description: item.prompt,
        badge: item.category,
        tags: item.tags,
      })),
    [adminItems],
  );

  const searchCards = useMemo<ExampleImageCardData[]>(
    () =>
      searchItems.map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        source: item.source,
        sourceUrl: item.sourceUrl,
        badge: item.source,
      })),
    [searchItems],
  );

  const renderCard = (item: ExampleImageCardData) => {
    const query = debouncedQuery || normalizedInput;
    const prompt = item.description || buildPrompt(item.title, query || item.source);
    const primaryHref = buildAiHref(item, prompt, query);

    return (
      <ExampleImageCard
        key={item.id}
        item={item}
        primaryHref={primaryHref}
        primaryLabel={text.convert}
        fallbackLabel={text.fallback}
      />
    );
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              <Sparkles className="h-4 w-4" />
              {text.eyebrow}
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{text.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{text.description}</p>
            {isAdmin && (
              <Link
                href="/admin/examples"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {text.manage}
              </Link>
            )}
          </div>

          <div className="mt-8 max-w-4xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(sanitizeSearchInput(event.target.value))}
                maxLength={80}
                placeholder={text.placeholder}
                className="h-14 w-full rounded-2xl border border-stone-300 bg-white pl-12 pr-12 text-base font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-stone-100 hover:text-slate-900"
                  aria-label={text.clearSearch}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase text-slate-500">{text.popular}</span>
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchInput(tag)}
                  className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">{searchMode ? text.searchSection : text.adminSection}</h2>
          {searchLoading && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              {text.searching}
            </span>
          )}
        </div>

        {searchMode ? (
          searchLoading || debouncedQuery !== normalizedInput ? (
            <SkeletonGrid />
          ) : searchError ? (
            <ErrorState message={searchError} />
          ) : searchCards.length === 0 ? (
            <EmptyState title={text.emptySearchTitle} text={text.emptySearchText} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{searchCards.map(renderCard)}</div>
          )
        ) : adminLoading ? (
          <SkeletonGrid />
        ) : adminError ? (
          <ErrorState message={adminError} />
        ) : adminCards.length === 0 ? (
          <EmptyState title={text.emptyTitle} text={text.emptyText} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{adminCards.map(renderCard)}</div>
        )}
      </section>
    </div>
  );
}
