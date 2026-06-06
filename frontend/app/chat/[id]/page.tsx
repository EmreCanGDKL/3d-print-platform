'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Box, ExternalLink, Send, Tag } from 'lucide-react';
import { useLanguage } from '@/lib/language';

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
  model?: {
    id: string;
    name: string | null;
    type: string;
    viewerDataKey?: string | null;
    category?: string | null;
  };
  participant: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
  messages: Message[];
}

type StoredUser = {
  id: string;
  role: 'USER' | 'SELLER';
};

const copy = {
  tr: {
    loading: 'Sohbet hazırlanıyor...',
    fallbackTitle: 'Mesajlaşma',
    missingModel: 'Sohbet başlatmak için model bilgisi eksik.',
    fetchError: 'Sohbet alınamadı.',
    createError: 'Sohbet başlatılamadı.',
    prepareError: 'Sohbet hazırlanamadı.',
    sendError: 'Mesaj gönderilemedi.',
    back: 'Mesajlara dön',
    subtitle: 'Teklif, üretim notları ve teslim detayları bu konuşmada takip edilir.',
    empty: 'Henüz mesaj yok. İlk mesajı göndererek teklif sürecini başlatın.',
    quote: 'Teklif',
    quoteLabel: 'Teklif tutarı (opsiyonel)',
    quotePlaceholder: 'Örn. 850',
    messagePlaceholder: 'Mesajınızı yazın...',
    send: 'Gönder',
    aiModel: 'AI ile üretilmiş 3D model',
    catalogModel: 'Katalog ürünü',
    openAiModel: '3D modeli görüntüle',
    openCatalogModel: 'Ürün detayını aç',
  },
  en: {
    loading: 'Preparing chat...',
    fallbackTitle: 'Conversation',
    missingModel: 'Model information is missing for starting a chat.',
    fetchError: 'Chat could not be loaded.',
    createError: 'Chat could not be started.',
    prepareError: 'Chat could not be prepared.',
    sendError: 'Message could not be sent.',
    back: 'Back to messages',
    subtitle: 'Quotes, production notes, and delivery details are tracked in this conversation.',
    empty: 'No messages yet. Send the first message to start the quote process.',
    quote: 'Quote',
    quoteLabel: 'Quote amount (optional)',
    quotePlaceholder: 'Ex. 850',
    messagePlaceholder: 'Write your message...',
    send: 'Send',
    aiModel: 'AI-generated 3D model',
    catalogModel: 'Catalog product',
    openAiModel: 'View 3D model',
    openCatalogModel: 'Open product details',
  },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function Chat() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const text = copy[language];
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const modelId = searchParams.get('modelId');
  const modelType = searchParams.get('type') || 'CATALOG';
  const sellerId = searchParams.get('sellerId');

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const newConversationStartedRef = useRef(false);

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

  useEffect(() => {
    if (conversationId !== 'new') {
      newConversationStartedRef.current = false;
    }
  }, [conversationId]);

  const fetchConversation = useCallback(
    async (id: string) => {
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
        throw new Error(data.error || text.fetchError);
      }

      setConversation(data);
      setMessages(data.messages || []);
    },
    [router, text.fetchError],
  );

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
          if (newConversationStartedRef.current) return;
          if (!modelId) throw new Error(text.missingModel);
          newConversationStartedRef.current = true;

          const response = await fetch('/api/chat/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ modelId, type: modelType, sellerId: sellerId || undefined }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || text.createError);
          router.replace(`/chat/${data.conversationId}`);
          return;
        }

        if (conversationId) {
          await fetchConversation(conversationId);
        }
      } catch (err: any) {
        newConversationStartedRef.current = false;
        if (!cancelled) setError(err.message || text.prepareError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [conversationId, fetchConversation, modelId, modelType, router, sellerId, text.createError, text.missingModel, text.prepareError]);

  useEffect(() => {
    if (!conversationId || conversationId === 'new') return;

    const interval = window.setInterval(() => {
      void fetchConversation(conversationId).catch(() => undefined);
    }, 7000);

    const refreshOnFocus = () => {
      void fetchConversation(conversationId).catch(() => undefined);
    };

    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [conversationId, fetchConversation]);

  const title = useMemo(() => {
    if (!conversation) return text.fallbackTitle;
    return conversation.modelName || `Model ${conversation.modelId}`;
  }, [conversation, text.fallbackTitle]);

  const modelHref = useMemo(() => {
    if (!conversation) return '#';
    const type = (conversation.modelType || conversation.model?.type || '').toUpperCase();
    if (type === 'AI') {
      return `/ai-generator?modelId=${encodeURIComponent(conversation.modelId)}`;
    }
    return `/marketplace?modelId=${encodeURIComponent(conversation.modelId)}`;
  }, [conversation]);

  const isAiModel = (conversation?.modelType || conversation?.model?.type || '').toUpperCase() === 'AI';

  const renderMessageContent = (content: string) => {
    if (!conversation || !title || !content.includes(title)) {
      return content;
    }

    const [before, ...rest] = content.split(title);
    return (
      <>
        {before}
        <Link href={modelHref} className="font-bold underline underline-offset-2">
          {title}
        </Link>
        {rest.join(title)}
      </>
    );
  };

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
      if (!response.ok) throw new Error(data.error || text.sendError);

      setMessages((items) => [...items, data]);
      setNewMessage('');
      setQuoteAmount('');
    } catch (err: any) {
      setError(err.message || text.sendError);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm">
          {text.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/messages')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          {text.back}
        </button>
        {conversation?.participant && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            {conversation.participant.name}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
          <Link
            href={modelHref}
            className="inline-flex items-center gap-2 text-lg font-semibold text-slate-950 transition hover:text-emerald-800"
          >
            {title}
            <ExternalLink className="h-4 w-4" />
          </Link>
          <p className="mt-1 text-sm text-slate-500">{text.subtitle}</p>
          {conversation && (
            <Link
              href={modelHref}
              className="mt-4 flex max-w-xl items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Box className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {isAiModel ? text.aiModel : text.catalogModel}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold text-emerald-800">
                {isAiModel ? text.openAiModel : text.openCatalogModel}
              </span>
            </Link>
          )}
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
              {text.empty}
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
                          {text.quote}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{renderMessageContent(message.content)}</p>
                    {message.isQuote && message.quoteAmount ? (
                      <p className="mt-2 text-base font-bold">
                        TL {message.quoteAmount.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
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
              <label className="mb-1 block text-xs font-semibold text-slate-600">{text.quoteLabel}</label>
              <input
                type="number"
                min={1}
                value={quoteAmount}
                onChange={(event) => setQuoteAmount(event.target.value)}
                placeholder={text.quotePlaceholder}
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
              placeholder={text.messagePlaceholder}
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
              {text.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
