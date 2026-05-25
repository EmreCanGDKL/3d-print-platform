'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

type Product = {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  price: number;
  imageUrls: string[];
  status: string;
};

type StoredUser = {
  role?: string;
};

const copy = {
  tr: {
    title: 'Ürünlerim',
    description: 'Kataloğa eklediğiniz ürünleri buradan görüntüleyin, düzenleyin veya kaldırın.',
    addProduct: 'Yeni ürün ekle',
    loading: 'Ürünler yükleniyor...',
    emptyTitle: 'Henüz ürün yok',
    emptyText: 'İlk ürününüzü ekleyerek katalogda görünmeye başlayın.',
    productName: 'Ürün adı',
    descriptionLabel: 'Açıklama',
    category: 'Kategori',
    price: 'Fiyat',
    cover: 'Kapak',
    makeCover: 'Kapak yap',
    save: 'Kaydet',
    saving: 'Kaydediliyor...',
    remove: 'Kaldır',
    confirmRemove: 'Bu ürünü katalogdan kaldırmak istiyor musunuz?',
    saved: 'Ürün güncellendi.',
    removed: 'Ürün kaldırıldı.',
    fallbackError: 'İşlem tamamlanamadı.',
    apiFallback: 'API cevabı okunamadı. Backend bağlantısını kontrol edin.',
    sellerOnly: 'Bu sayfa satıcı hesapları içindir.',
    categories: [
      { value: 'art', label: 'Sanat ve dekor' },
      { value: 'functional', label: 'Fonksiyonel parçalar' },
      { value: 'figurine', label: 'Figürler' },
      { value: 'mechanical', label: 'Mekanik parçalar' },
      { value: 'jewelry', label: 'Aksesuar / mücevher' },
    ],
  },
  en: {
    title: 'My products',
    description: 'View, edit, or remove the products you added to the catalog.',
    addProduct: 'Add new product',
    loading: 'Loading products...',
    emptyTitle: 'No products yet',
    emptyText: 'Add your first product to appear in the catalog.',
    productName: 'Product name',
    descriptionLabel: 'Description',
    category: 'Category',
    price: 'Price',
    cover: 'Cover',
    makeCover: 'Make cover',
    save: 'Save',
    saving: 'Saving...',
    remove: 'Remove',
    confirmRemove: 'Do you want to remove this product from the catalog?',
    saved: 'Product updated.',
    removed: 'Product removed.',
    fallbackError: 'The action could not be completed.',
    apiFallback: 'The API response could not be read. Check the backend connection.',
    sellerOnly: 'This page is for seller accounts.',
    categories: [
      { value: 'art', label: 'Art and decor' },
      { value: 'functional', label: 'Functional parts' },
      { value: 'figurine', label: 'Figures' },
      { value: 'mechanical', label: 'Mechanical parts' },
      { value: 'jewelry', label: 'Accessories / jewelry' },
    ],
  },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function SellerProductsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProducts = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchWithTimeout('/api/models/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse<{ items?: Product[]; error?: string }>(response, text.apiFallback);
      if (!response.ok) throw new Error(data.error || text.fallbackError);
      setProducts(data.items || []);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setLoading(false);
    }
  }, [router, text.apiFallback, text.fallbackError]);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    const token = getToken();
    if (!rawUser || !token) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(rawUser) as StoredUser;
      if (user.role !== 'SELLER') {
        setError(text.sellerOnly);
        setLoading(false);
        return;
      }
    } catch {
      router.replace('/login');
      return;
    }

    void loadProducts();
  }, [loadProducts, router, text.sellerOnly]);

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setProducts((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const makeCover = (product: Product, index: number) => {
    const images = [...product.imageUrls];
    const [cover] = images.splice(index, 1);
    updateProduct(product.id, { imageUrls: cover ? [cover, ...images] : product.imageUrls });
  };

  const saveProduct = async (product: Product) => {
    const token = getToken();
    if (!token || savingId) return;

    setSavingId(product.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout(`/api/models/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: product.name,
          description: product.description || '',
          category: product.category,
          price: product.price,
          imageUrls: product.imageUrls,
        }),
      });
      const data = await readJsonResponse<{ product?: Product; error?: string }>(response, text.apiFallback);
      if (!response.ok) throw new Error(data.error || text.fallbackError);
      if (data.product) updateProduct(product.id, data.product);
      setSuccess(text.saved);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setSavingId('');
    }
  };

  const removeProduct = async (id: string) => {
    const token = getToken();
    if (!token || savingId) return;
    if (!window.confirm(text.confirmRemove)) return;

    setSavingId(id);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout(`/api/models/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse<{ error?: string }>(response, text.apiFallback);
      if (!response.ok) throw new Error(data.error || text.fallbackError);
      setProducts((items) => items.filter((item) => item.id !== id));
      setSuccess(text.removed);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setSavingId('');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-3xl items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          {text.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start gap-4 text-left">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text.description}</p>
        </div>
        <Link
          href="/seller/add-product"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {text.addProduct}
        </Link>
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

      {products.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">{text.emptyTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{text.emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {products.map((product) => (
            <section key={product.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                <div>
                  <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                    {product.imageUrls[0] ? (
                      <img src={product.imageUrls[0]} alt={product.name || ''} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-sm text-slate-500">-</div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {product.imageUrls.map((url, index) => (
                      <button
                        key={`${product.id}-${url}`}
                        type="button"
                        onClick={() => makeCover(product, index)}
                        className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                        title={text.makeCover}
                      >
                        <img src={url} alt="" className="aspect-square w-full object-cover" />
                        {index === 0 && (
                          <span className="absolute left-1 top-1 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {text.cover}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">{text.productName}</label>
                      <input
                        value={product.name || ''}
                        onChange={(event) => updateProduct(product.id, { name: event.target.value })}
                        className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">{text.price}</label>
                      <input
                        type="number"
                        min={1}
                        value={product.price || ''}
                        onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })}
                        className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">{text.category}</label>
                    <select
                      value={product.category || 'art'}
                      onChange={(event) => updateProduct(product.id, { category: event.target.value })}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      {text.categories.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">{text.descriptionLabel}</label>
                    <textarea
                      rows={3}
                      value={product.description || ''}
                      onChange={(event) => updateProduct(product.id, { description: event.target.value })}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void saveProduct(product)}
                      disabled={savingId !== ''}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingId === product.id ? text.saving : text.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeProduct(product.id)}
                      disabled={savingId !== ''}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {text.remove}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
