'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Send, Tag } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'seller';
  content: string;
  timestamp: string;
  isQuote?: boolean;
  quoteAmount?: number | null;
  quoteCurrency?: string | null;
}

interface Conversation {
  id: string;
  modelId: string;
  modelName: string | null;
  modelType: string;
  participant: {
    id: string;
    name: string;
    role: string;
  };
  messages: Message[];
}

type StoredUser = {
  id: string;
  role: 'USER' | 'SELLER';
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function Chat() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const modelId = searchParams.get('modelId');
  const modelType = searchParams.get('type') || 'CATALOG';

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  const isSeller = currentUser?.role === 'SELLER';
  const canSendQuote = isSeller && conversation?.modelType !== 'CATALOG';

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return;
    try {
      setCurrentUser(JSON.parse(rawUser) as StoredUser);
    } catch {
      localStorage.removeItem('user');
    }
  }, []);

  const fetchConversation = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const response = await fetch(`/api/chat/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sohbet alınamadı.');
    }

    setConversation(data);
    setMessages(data.messages || []);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      setLoading(true);
      setError('');
      const token = getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        if (conversationId === 'new') {
          if (!modelId) throw new Error('Sohbet başlatmak için model bilgisi eksik.');

          const response = await fetch('/api/chat/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ modelId, type: modelType }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Sohbet başlatılamadı.');
          if (!cancelled) router.replace(`/chat/${data.conversationId}`);
          return;
        }

        if (conversationId) {
          await fetchConversation(conversationId);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Sohbet hazırlanamadı.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [conversationId, fetchConversation, modelId, modelType, router]);

  const title = useMemo(() => {
    if (!conversation) return 'Mesajlaşma';
    return conversation.modelName || `Model ${conversation.modelId}`;
  }, [conversation]);

  const sendMessage = async () => {
    if (!conversation || !newMessage.trim() || sending) return;
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setSending(true);
    setError('');

    try {
      const amount = Number(quoteAmount);
      const response = await fetch(`/api/chat/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          isQuote: canSendQuote && Number.isFinite(amount) && amount > 0,
          quoteAmount: canSendQuote && Number.isFinite(amount) && amount > 0 ? amount : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Mesaj gönderilemedi.');

      setMessages((items) => [...items, data]);
      setNewMessage('');
      setQuoteAmount('');
    } catch (err: any) {
      setError(err.message || 'Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Sohbet hazırlanıyor...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/marketplace')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Kataloğa dön
        </button>
        {conversation?.participant && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            {conversation.participant.name}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
          <h1 className="text-lg font-semibold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Teklif, üretim notları ve teslim detayları bu konuşmada takip edilir.</p>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
              Henüz mesaj yok. İlk mesajı göndererek teklif sürecini başlatın.
            </div>
          ) : (
            messages.map((message) => {
              const mine = message.senderId === currentUser?.id;
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                      mine ? 'bg-slate-950 text-white' : 'bg-stone-100 text-slate-800'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                      <span className="font-semibold">{message.senderName}</span>
                      {message.isQuote && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold">
                          <Tag className="h-3 w-3" />
                          Teklif
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    {message.isQuote && message.quoteAmount ? (
                      <p className="mt-2 text-base font-bold">
                        ₺{message.quoteAmount.toLocaleString('tr-TR')}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-stone-200 bg-white p-4">
          {canSendQuote && (
            <div className="mb-3 max-w-xs">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Teklif tutarı (opsiyonel)</label>
              <input
                type="number"
                min={1}
                value={quoteAmount}
                onChange={(event) => setQuoteAmount(event.target.value)}
                placeholder="Örn. 850"
                className="h-10 w-full rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Mesajınızı yazın..."
              rows={1}
              className="min-h-11 flex-1 resize-none rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
