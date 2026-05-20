'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Inbox, MessageSquare, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/language';

type StoredUser = {
  id: string;
  role: 'USER' | 'SELLER';
};

type MessageItem = {
  id: string;
  modelId: string;
  modelName: string | null;
  modelType: string;
  status: string;
  statusLabel: string;
  participant: {
    id: string;
    name: string;
    email?: string;
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

const copy = {
  tr: {
    eyebrow: 'Mesaj merkezi',
    title: 'Mesajlar',
    description: 'Satıcı ve müşteri konuşmalarını sipariş ekranından ayrı olarak buradan takip edin.',
    search: 'Kişi, ürün veya mesaj ara',
    loading: 'Mesajlar yükleniyor...',
    emptyTitle: 'Henüz mesaj yok',
    emptyText: 'Bir ürün hakkında satıcıya yazdığınızda veya size yeni mesaj geldiğinde burada görünür.',
    marketplace: 'Kataloğa git',
    open: 'Mesaj penceresini aç',
    remove: 'Kaldır',
    confirmRemove: 'Bu mesaj penceresini listenizden kaldırmak istiyor musunuz?',
    removeFailed: 'Mesaj penceresi kaldırılamadı.',
    seller: 'Satıcı',
    buyer: 'Müşteri',
    unread: 'yeni mesaj',
    noPreview: 'Henüz mesaj içeriği yok.',
    fallbackError: 'Mesaj listesi alınamadı.',
    apiError:
      "Mesaj API'sinden beklenen cevap gelmedi. Backend çalışıyor mu ve son deploy tamamlandı mı kontrol edin.",
    aiModel: 'AI modeli',
    catalogModel: 'Katalog ürünü',
  },
  en: {
    eyebrow: 'Message center',
    title: 'Messages',
    description: 'Track seller and customer conversations here, separate from the order screen.',
    search: 'Search people, products, or messages',
    loading: 'Loading messages...',
    emptyTitle: 'No messages yet',
    emptyText: 'When you message a seller or receive a new reply, it will appear here.',
    marketplace: 'Go to catalog',
    open: 'Open chat window',
    remove: 'Remove',
    confirmRemove: 'Do you want to remove this conversation from your list?',
    removeFailed: 'Conversation could not be removed.',
    seller: 'Seller',
    buyer: 'Customer',
    unread: 'new message',
    noPreview: 'No message content yet.',
    fallbackError: 'Messages could not be loaded.',
    apiError: 'The message API returned an unexpected response. Check whether the backend is running.',
    aiModel: 'AI model',
    catalogModel: 'Catalog product',
  },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(fallbackMessage);
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [user, setUser] = useState<StoredUser | null>(null);
  const [items, setItems] = useState<MessageItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState('');

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

  const loadMessages = useCallback(async (silent = false) => {
    const token = getToken();
    if (!token) return;

    if (!silent) setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat/inbox/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiJson<{ items?: MessageItem[]; error?: string }>(response, text.apiError);

      if (!response.ok) {
        throw new Error(data.error || text.fallbackError);
      }

      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [text.apiError, text.fallbackError]);

  useEffect(() => {
    if (user) void loadMessages();
  }, [loadMessages, user]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      void loadMessages(true);
    }, 10000);

    const refreshOnFocus = () => {
      void loadMessages(true);
    };

    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadMessages, user]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US');
    if (!normalized) return items;

    return items.filter((item) => {
      const haystack = [
        item.modelName || '',
        item.participant.name,
        item.latestMessage?.content || '',
        item.statusLabel,
      ]
        .join(' ')
        .toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US');
      return haystack.includes(normalized);
    });
  }, [items, language, query]);

  const removeConversation = async (id: string) => {
    const token = getToken();
    if (!token || removingId) return;
    if (!window.confirm(text.confirmRemove)) return;

    setRemovingId(id);
    setError('');

    try {
      const response = await fetch(`/api/chat/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiJson<{ error?: string }>(response, text.apiError);
      if (!response.ok) throw new Error(data.error || text.removeFailed);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err.message || text.removeFailed);
    } finally {
      setRemovingId('');
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
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{text.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text.description}</p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.search}
            className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {error && (
        <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <Inbox className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">{text.emptyTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{text.emptyText}</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {text.marketplace}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg md:grid-cols-[1fr_auto]"
            >
              <Link href={`/chat/${item.id}`} className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold text-slate-950">
                    {item.modelName || (item.modelType === 'AI' ? text.aiModel : text.catalogModel)}
                  </h2>
                  {item.unreadCount > 0 && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                      {item.unreadCount} {text.unread}
                    </span>
                  )}
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {item.modelType === 'AI' ? text.aiModel : text.catalogModel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {item.participant.role === 'seller' ? text.seller : text.buyer}: {item.participant.name}
                  {item.participant.email ? ` · ${item.participant.email}` : ''}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                  {item.latestMessage?.content || text.noPreview}
                </p>
              </Link>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="text-xs font-medium text-slate-500">
                  {new Date(item.updatedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                </span>
                <Link
                  href={`/chat/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-slate-800"
                >
                  <MessageSquare className="h-4 w-4" />
                  {text.open}
                </Link>
                <button
                  type="button"
                  onClick={() => void removeConversation(item.id)}
                  disabled={removingId !== ''}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={text.remove}
                >
                  <Trash2 className="h-4 w-4" />
                  {text.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
