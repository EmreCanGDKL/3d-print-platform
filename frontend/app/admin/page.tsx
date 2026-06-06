'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, Boxes, MailX, RefreshCw, Trash2, Users } from 'lucide-react';
import { apiUrl, fetchWithTimeout, readJsonResponse } from '@/lib/api';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  effectiveRole: string;
  companyName?: string | null;
  createdAt: string;
  _count: {
    aiModels: number;
    buyerConversations: number;
    sellerConversations: number;
  };
};

type AdminModel = {
  id: string;
  name?: string | null;
  type: string;
  status: string;
  category?: string | null;
  priceRangeMin?: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
  };
};

type AdminOverview = {
  users: AdminUser[];
  models: AdminModel[];
  blockedEmails: Array<{ email: string; createdAt: string }>;
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function AdminPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as { role?: string; id?: string }) : null;
    } catch {
      return null;
    }
  }, []);

  const loadData = async () => {
    const token = getToken();
    if (!token) {
      setError('Admin paneli için giriş yapın.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await fetchWithTimeout(apiUrl('/api/admin/overview'), {
        headers: { Authorization: `Bearer ${token}` },
      }, 30000);
      const payload = await readJsonResponse<AdminOverview | { error?: string }>(response, 'Admin verileri okunamadı.');
      if (!response.ok || !('users' in payload)) {
        throw new Error('error' in payload ? payload.error || 'Admin verileri alınamadı.' : 'Admin verileri alınamadı.');
      }
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Admin verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const adminRequest = async (path: string, options: RequestInit, success: () => void) => {
    const token = getToken();
    if (!token) return;
    try {
      setBusy(path);
      setError('');
      const response = await fetchWithTimeout(apiUrl(path), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      }, 30000);
      const payload = await readJsonResponse<{ error?: string }>(response, 'İşlem tamamlanamadı.');
      if (!response.ok) throw new Error(payload.error || 'İşlem tamamlanamadı.');
      success();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'İşlem tamamlanamadı.');
    } finally {
      setBusy('');
    }
  };

  const blockEmail = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    await adminRequest('/api/admin/blocked-emails', {
      method: 'POST',
      body: JSON.stringify({ email: normalized }),
    }, () => setEmail(''));
  };

  const unblockEmail = async (value: string) => {
    await adminRequest(`/api/admin/blocked-emails/${encodeURIComponent(value)}`, { method: 'DELETE' }, () => undefined);
  };

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`${user.email} kullanıcısı kalıcı olarak silinsin mi?`)) return;
    await adminRequest(`/api/admin/users/${user.id}`, { method: 'DELETE' }, () => undefined);
  };

  const removeModel = async (model: AdminModel) => {
    if (!window.confirm(`${model.name || model.id} ürünü kaldırılsın mı?`)) return;
    await adminRequest(`/api/admin/models/${model.id}`, { method: 'DELETE' }, () => undefined);
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <AlertCircle className="mb-3 h-6 w-6" />
          Bu sayfa sadece admin hesabı içindir.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Admin paneli</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Platform yönetimi</h1>
          <p className="mt-2 text-sm text-slate-600">Kullanıcıları, engelli e-postaları ve katalog ürünlerini yönetin.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          <Link href="/admin/examples" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Örnek yönetimi
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-slate-600">Admin verileri yükleniyor...</div>
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MailX className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-950">Mail engelleme</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="engel@example.com"
                className="h-11 flex-1 rounded-xl border border-stone-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => void blockEmail()}
                disabled={!email.trim() || Boolean(busy)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                Mail engelle
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data?.blockedEmails.length ? data.blockedEmails.map((item) => (
                <button
                  key={item.email}
                  type="button"
                  onClick={() => void unblockEmail(item.email)}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800"
                >
                  {item.email} kaldır
                </button>
              )) : <p className="text-sm text-slate-500">Engelli mail yok.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-950">Kullanıcılar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3">Kullanıcı</th>
                    <th>Rol</th>
                    <th>Aktivite</th>
                    <th className="text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data?.users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-3">
                        <p className="font-semibold text-slate-950">{user.companyName || user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="font-semibold">{user.effectiveRole}</td>
                      <td className="text-xs text-slate-600">
                        {user._count.aiModels} model, {user._count.buyerConversations + user._count.sellerConversations} sohbet
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => void deleteUser(user)}
                          disabled={user.effectiveRole === 'ADMIN' || Boolean(busy)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-950">Ürünler ve modeller</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {data?.models.map((model) => (
                <article key={model.id} className="rounded-xl border border-stone-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{model.name || model.id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {model.type} · {model.status} · {model.user.companyName || model.user.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeModel(model)}
                      disabled={Boolean(busy)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Kaldır
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
