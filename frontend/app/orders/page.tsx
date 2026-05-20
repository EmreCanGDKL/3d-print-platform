'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, MessageSquare, PackageCheck, Truck, XCircle } from 'lucide-react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

type StoredUser = {
  id: string;
  role: 'USER' | 'SELLER';
};

type OrderItem = {
  id: string;
  modelId: string;
  modelName: string | null;
  modelType: string;
  status: string;
  statusLabel: string;
  price: number;
  participant: {
    id: string;
    name: string;
    role: 'seller' | 'buyer';
  };
  latestMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

const orderStatuses = ['ORDERED', 'PREPARING', 'SHIPPED', 'COMPLETED'];

const copy = {
  tr: {
    actions: {
      PREPARING: 'Hazırlanıyor',
      SHIPPED: 'Kargoya verildi',
      COMPLETED: 'Tamamlandı',
    },
    labels: {
      ORDERED: 'Sipariş alındı',
      PREPARING: 'Hazırlanıyor',
      SHIPPED: 'Kargoda',
      COMPLETED: 'Tamamlandı',
      CANCELLED: 'İptal edildi',
    } as Record<string, string>,
    apiFallback: "Sipariş API'sinden beklenen cevap gelmedi. Backend çalışıyor mu kontrol edin.",
    loadFailed: 'Siparişler alınamadı.',
    updateFailed: 'Durum güncellenemedi.',
    loading: 'Siparişler yükleniyor...',
    sellerEyebrow: 'Satıcı bildirimleri',
    buyerEyebrow: 'Müşteri sipariş takibi',
    sellerTitle: 'Gelen siparişler',
    buyerTitle: 'Siparişlerim',
    description: 'Sipariş durumları ve sipariş bildirimleri burada toplanır. Mesaj konuşmaları ayrı mesaj ekranındadır.',
    back: 'Kataloğa dön',
    emptyTitle: 'Henüz takip edilecek sipariş yok',
    emptyText: 'Bir ürün satın alındığında veya sipariş durumu değiştiğinde burada görünür.',
    product: 'Ürün',
    newMessage: 'yeni mesaj',
    seller: 'Satıcı',
    buyer: 'Müşteri',
    messages: 'Mesajlar',
    cancel: 'İptal et',
    cancelled: 'Sipariş iptal edildi.',
  },
  en: {
    actions: {
      PREPARING: 'Preparing',
      SHIPPED: 'Shipped',
      COMPLETED: 'Completed',
    },
    labels: {
      ORDERED: 'Order received',
      PREPARING: 'Preparing',
      SHIPPED: 'In shipment',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    } as Record<string, string>,
    apiFallback: 'The order API returned an unexpected response. Check whether the backend is running.',
    loadFailed: 'Orders could not be loaded.',
    updateFailed: 'Status could not be updated.',
    loading: 'Loading orders...',
    sellerEyebrow: 'Seller notifications',
    buyerEyebrow: 'Customer order tracking',
    sellerTitle: 'Incoming orders',
    buyerTitle: 'My orders',
    description: 'Order statuses and order notifications are collected here. Message conversations live in the separate messages screen.',
    back: 'Back to catalog',
    emptyTitle: 'No orders to track yet',
    emptyText: 'Orders and status changes will appear here.',
    product: 'Product',
    newMessage: 'new message',
    seller: 'Seller',
    buyer: 'Customer',
    messages: 'Messages',
    cancel: 'Cancel',
    cancelled: 'Order cancelled.',
  },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function OrdersPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const [user, setUser] = useState<StoredUser | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    const token = getToken();
    if (!rawUser || !token) {
      router.replace('/login');
      return;
    }

    try {
      setUser(JSON.parse(rawUser) as StoredUser);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetchWithTimeout('/api/chat/inbox/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse<{ items?: OrderItem[]; error?: string }>(response, text.apiFallback);

      if (!response.ok) {
        throw new Error(data.error || text.loadFailed);
      }

      setItems(data.items || []);
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [text.apiFallback, text.loadFailed]);

  useEffect(() => {
    if (user) void loadOrders();
  }, [loadOrders, user]);

  const visibleItems = useMemo(() => items.filter((item) => item.status !== 'ACTIVE'), [items]);

  const updateStatus = async (id: string, status: string) => {
    const token = getToken();
    if (!token || updatingId) return;

    setUpdatingId(id);
    setError('');

    try {
      const response = await fetchWithTimeout(`/api/chat/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await readJsonResponse<{ error?: string }>(response, text.apiFallback);

      if (!response.ok) {
        throw new Error(data.error || text.updateFailed);
      }

      await loadOrders();
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.apiFallback : err.message || text.updateFailed);
    } finally {
      setUpdatingId(null);
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
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {user?.role === 'SELLER' ? text.sellerEyebrow : text.buyerEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {user?.role === 'SELLER' ? text.sellerTitle : text.buyerTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{text.description}</p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
        >
          {text.back}
        </Link>
      </div>

      {error && (
        <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <PackageCheck className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">{text.emptyTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{text.emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {visibleItems.map((item) => {
            const activeIndex = orderStatuses.indexOf(item.status);
            const isOrder = item.status !== 'ACTIVE';
            return (
              <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">{item.modelName || text.product}</h2>
                      {item.unreadCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                          {item.unreadCount} {text.newMessage}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.participant.role === 'seller' ? text.seller : text.buyer}: {item.participant.name}
                    </p>
                    {isOrder && (
                      <p className="mt-2 text-xl font-bold text-slate-950">TL {item.price.toLocaleString(locale)}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/chat/${item.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-stone-100"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {text.messages}
                    </Link>
                    {user?.role === 'USER' && isOrder && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => void updateStatus(item.id, 'CANCELLED')}
                        disabled={updatingId === item.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        {text.cancel}
                      </button>
                    )}
                  </div>
                </div>

                {isOrder && (
                  <div className="mt-6">
                    <div className="grid gap-3 md:grid-cols-4">
                      {orderStatuses.map((status, index) => {
                        const reached = item.status === 'CANCELLED' ? false : activeIndex >= index;
                        return (
                          <div
                            key={status}
                            className={`rounded-xl border p-3 ${
                              reached ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-stone-200 bg-stone-50 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {status === 'SHIPPED' ? <Truck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              <span className="text-sm font-bold">{text.labels[status] || status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {item.status === 'CANCELLED' && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                        {text.cancelled}
                      </div>
                    )}

                    {user?.role === 'SELLER' && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(['PREPARING', 'SHIPPED', 'COMPLETED'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void updateStatus(item.id, status)}
                            disabled={updatingId === item.id || item.status === status}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {text.actions[status]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {item.latestMessage && (
                  <div className="mt-5 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">{item.latestMessage.content}</div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
