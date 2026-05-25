'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { CartItem, clearCart, readCart, removeFromCart, setCartItemQuantity } from '@/lib/cart';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

const copy = {
  tr: {
    apiFallback: "Sipariş API'sinden beklenen cevap gelmedi. Backend çalışıyor mu kontrol edin.",
    itemOrderFailed: 'için sipariş oluşturulamadı.',
    orderSuccess: 'Siparişler oluşturuldu. Takip ekranına yönlendiriliyorsunuz...',
    orderFailed: 'Sipariş oluşturulamadı.',
    eyebrow: 'Alışveriş sepeti',
    title: 'Sepetim',
    description: 'Birden fazla ürünü sepete ekleyip tek adımda sipariş oluşturabilirsiniz.',
    continue: 'Alışverişe devam et',
    emptyTitle: 'Sepetiniz boş',
    emptyText: 'Katalogdan ürünleri sepete ekleyebilirsiniz.',
    noImage: 'Görsel yok',
    seller: 'Satıcı',
    unit: 'Birim',
    decrease: 'Adedi azalt',
    increase: 'Adedi artır',
    remove: 'Kaldır',
    summary: 'Sipariş özeti',
    quantity: 'Ürün adedi',
    variety: 'Sepetteki çeşit',
    total: 'Toplam',
    ordering: 'Sipariş oluşturuluyor',
    checkout: 'Siparişi tamamla',
  },
  en: {
    apiFallback: 'The order API returned an unexpected response. Check whether the backend is running.',
    itemOrderFailed: 'could not be ordered.',
    orderSuccess: 'Orders were created. Redirecting to the tracking screen...',
    orderFailed: 'Order could not be created.',
    eyebrow: 'Shopping cart',
    title: 'My cart',
    description: 'Add multiple products to your cart and place orders in one step.',
    continue: 'Continue shopping',
    emptyTitle: 'Your cart is empty',
    emptyText: 'You can add products from the catalog.',
    noImage: 'No image',
    seller: 'Seller',
    unit: 'Unit',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    remove: 'Remove',
    summary: 'Order summary',
    quantity: 'Product quantity',
    variety: 'Cart items',
    total: 'Total',
    ordering: 'Creating order',
    checkout: 'Complete order',
  },
};

export default function CartPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const [items, setItems] = useState<CartItem[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setItems(readCart());
  }, [router]);

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (items.length === 0 || ordering) return;

    setOrdering(true);
    setError('');
    setSuccess('');

    try {
      for (const item of items) {
        const response = await fetchWithTimeout('/api/chat/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ modelId: item.id, quantity: item.quantity }),
        });
        const data = await readJsonResponse<{ error?: string }>(response, text.apiFallback);
        if (!response.ok) {
          throw new Error(data.error || `${item.name} ${text.itemOrderFailed}`);
        }
      }

      clearCart();
      setItems([]);
      setSuccess(text.orderSuccess);
      router.push('/orders');
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.orderFailed);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start gap-4 text-left">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-emerald-800">{text.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text.description}</p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
        >
          {text.continue}
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

      {items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <ShoppingCart className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">{text.emptyTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{text.emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto]">
                <div className="overflow-hidden rounded-xl bg-stone-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-28 w-full object-cover sm:h-full" />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs text-slate-500">{text.noImage}</div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">{item.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">{text.seller}: {item.seller.name}</p>
                </div>
                <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-950">TL {(item.price * item.quantity).toLocaleString(locale)}</p>
                    <p className="text-xs font-medium text-slate-500">{text.unit}: TL {item.price.toLocaleString(locale)}</p>
                  </div>
                  <div className="flex h-10 items-center overflow-hidden rounded-xl border border-stone-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setItems(setCartItemQuantity(item.id, item.quantity - 1))}
                      className="inline-flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-stone-100"
                      aria-label={text.decrease}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-10 min-w-10 items-center justify-center border-x border-stone-300 px-3 text-sm font-bold text-slate-950">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems(setCartItemQuantity(item.id, item.quantity + 1))}
                      className="inline-flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-stone-100"
                      aria-label={text.increase}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems(removeFromCart(item.id))}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {text.remove}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{text.summary}</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>{text.quantity}</span>
                <span className="font-semibold">{totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>{text.variety}</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-3 text-base">
                <span className="font-bold text-slate-950">{text.total}</span>
                <span className="font-bold text-slate-950">TL {total.toLocaleString(locale)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={ordering}
              className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ordering ? text.ordering : text.checkout}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
