'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ImageOff, Plus, Trash2 } from 'lucide-react';
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

const emptyForm = {
  title: '',
  category: '',
  imageUrl: '',
  prompt: '',
  tags: '',
};

const copy = {
  tr: {
    title: 'Örnek yönetimi',
    description: 'Örnekler sayfasında görünecek internet veya lokal görsel bağlantılarını buradan ekleyin.',
    titleLabel: 'Başlık',
    category: 'Kategori',
    imageUrl: 'Görsel bağlantısı',
    imageUrlHelp: 'https://... veya /example-images/dosya.png gibi lokal bağlantı kullanabilirsiniz.',
    prompt: 'AI prompt',
    tags: 'Etiketler',
    tagsHelp: 'Virgülle ayırın: figür, dekor, cosplay',
    add: 'Örnek ekle',
    saving: 'Kaydediliyor...',
    remove: 'Sil',
    noAccess: 'Bu sayfa sadece admin hesabı içindir.',
    loading: 'Örnekler yükleniyor...',
    empty: 'Henüz örnek eklenmedi.',
    apiFallback: 'Örnek işlemi tamamlanamadı. Backend bağlantısını kontrol edin.',
    saved: 'Örnek eklendi.',
    removed: 'Örnek silindi.',
    previewFailed: 'Görsel yüklenemedi',
  },
  en: {
    title: 'Example management',
    description: 'Add internet or local image URLs that will appear on the Examples page.',
    titleLabel: 'Title',
    category: 'Category',
    imageUrl: 'Image URL',
    imageUrlHelp: 'Use https://... or a local path like /example-images/file.png.',
    prompt: 'AI prompt',
    tags: 'Tags',
    tagsHelp: 'Separate with commas: figurine, decor, cosplay',
    add: 'Add example',
    saving: 'Saving...',
    remove: 'Delete',
    noAccess: 'This page is only for admin accounts.',
    loading: 'Loading examples...',
    empty: 'No examples added yet.',
    apiFallback: 'The example action could not be completed. Check the backend connection.',
    saved: 'Example added.',
    removed: 'Example deleted.',
    previewFailed: 'Image could not load',
  },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function AdminExamplesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [imageFailedIds, setImageFailedIds] = useState<string[]>([]);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    const token = getToken();
    if (!rawUser || !token) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(rawUser) as StoredUser;
      setIsAdmin(user.role === 'ADMIN');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const loadExamples = useCallback(async () => {
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
  }, [text.apiFallback]);

  useEffect(() => {
    if (isAdmin) void loadExamples();
  }, [isAdmin, loadExamples]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getToken();
    if (!token || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout('/api/examples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          imageUrl: form.imageUrl,
          prompt: form.prompt,
          tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const data = await readJsonResponse<{ item?: ExampleItem; error?: string }>(response, text.apiFallback);
      if (!response.ok || !data.item) throw new Error(data.error || text.apiFallback);
      setItems((current) => [data.item!, ...current]);
      setForm(emptyForm);
      setSuccess(text.saved);
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.apiFallback);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const token = getToken();
    if (!token || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout(`/api/examples/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse<{ success?: boolean; error?: string }>(response, text.apiFallback);
      if (!response.ok) throw new Error(data.error || text.apiFallback);
      setItems((current) => current.filter((item) => item.id !== id));
      setSuccess(text.removed);
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.apiFallback);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-2xl items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-950">{text.noAccess}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 max-w-3xl text-left">
        <p className="text-sm font-semibold text-emerald-800">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text.description}</p>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
      {success && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              {text.titleLabel}
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                className="rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              {text.category}
              <input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                required
                className="rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              {text.imageUrl}
              <input
                value={form.imageUrl}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                required
                className="rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <span className="text-xs font-normal text-slate-500">{text.imageUrlHelp}</span>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              {text.prompt}
              <textarea
                rows={5}
                value={form.prompt}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                required
                className="resize-none rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              {text.tags}
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                className="rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <span className="text-xs font-normal text-slate-500">{text.tagsHelp}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? text.saving : text.add}
          </button>
        </form>

        <div className="grid gap-4">
          {loading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm">{text.loading}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm">{text.empty}</div>
          ) : (
            items.map((item) => {
              const failed = imageFailedIds.includes(item.id);
              return (
                <article key={item.id} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[140px_1fr_auto]">
                  <div className="overflow-hidden rounded-xl bg-stone-100">
                    {failed ? (
                      <div className="flex aspect-square items-center justify-center text-center text-xs font-semibold text-slate-500">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    ) : (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        onError={() => setImageFailedIds((ids) => [...ids, item.id])}
                        className="aspect-square w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">{item.category}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {text.remove}
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
