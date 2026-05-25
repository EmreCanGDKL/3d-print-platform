'use client';

import Link from 'next/link';
import { ArrowRight, ImageOff, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
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

type StoredUser = {
  role?: string;
};

const copy = {
  tr: {
    eyebrow: 'Örnekler / Hızlı Başlat',
    title: 'Bir fikir seçin, AI üretime hazır gelsin.',
    description:
      'Admin tarafından eklenen referanslarla hızlıca 3D model üretim akışını başlatın.',
    convert: 'AI ile Dönüştür',
    useReference: 'Referans Olarak Kullan',
    fallback: 'Görsel yüklenemedi',
    loading: 'Örnekler yükleniyor...',
    emptyTitle: 'Henüz örnek eklenmedi',
    emptyText: 'Admin panelinden internet görseli veya lokal görsel bağlantısı eklenince burada görünür.',
    manage: 'Örnek ekle',
    apiFallback: 'Örnekler alınamadı. Backend bağlantısını kontrol edin.',
  },
  en: {
    eyebrow: 'Examples / Quick Start',
    title: 'Pick an idea and start AI generation faster.',
    description:
      'Start the 3D model flow quickly with references added by the admin.',
    convert: 'Convert with AI',
    useReference: 'Use as Reference',
    fallback: 'Image could not load',
    loading: 'Loading examples...',
    emptyTitle: 'No examples yet',
    emptyText: 'Examples will appear here after the admin adds an internet or local image URL.',
    manage: 'Add example',
    apiFallback: 'Examples could not be loaded. Check the backend connection.',
  },
};

function buildAiHref(example: ExampleItem, action: 'convert' | 'reference') {
  const params = new URLSearchParams({
    action,
    title: example.title,
    category: example.category,
    imageUrl: example.imageUrl,
    prompt: example.prompt,
  });

  return `/ai-generator?${params.toString()}`;
}

function ExampleCard({ example, text }: { example: ExampleItem; text: typeof copy.tr }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
      <div className="relative aspect-square bg-stone-100">
        {imageFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
            <ImageOff className="h-8 w-8" />
            <span className="px-3 text-center text-xs font-semibold">{text.fallback}</span>
          </div>
        ) : (
          <img
            src={example.imageUrl}
            alt={example.title}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
          {example.category}
        </span>
      </div>

      <div className="flex min-h-64 flex-col p-4">
        <h2 className="line-clamp-2 text-base font-bold leading-6 text-slate-950">{example.title}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {example.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{example.prompt}</p>

        <div className="mt-auto grid gap-2 pt-4">
          <Link
            href={buildAiHref(example, 'convert')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            {text.convert}
          </Link>
          <Link
            href={buildAiHref(example, 'reference')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-100"
          >
            {text.useReference}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ExamplesPage() {
  const { language } = useLanguage();
  const text = copy[language];
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? (JSON.parse(rawUser) as StoredUser) : null;
      setIsAdmin(user?.role === 'ADMIN');
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const loadExamples = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetchWithTimeout('/api/examples');
        const data = await readJsonResponse<{ items?: ExampleItem[]; error?: string }>(response, text.apiFallback);
        if (!response.ok) throw new Error(data.error || text.apiFallback);
        setItems(data.items || []);
      } catch (err: any) {
        setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.apiFallback);
      } finally {
        setLoading(false);
      }
    };

    void loadExamples();
  }, [text.apiFallback]);

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
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm">
            {text.loading}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <ImageOff className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-xl font-bold text-slate-950">{text.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{text.emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {items.map((example) => (
              <ExampleCard key={example.id} example={example} text={text} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
