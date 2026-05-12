'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Store, UserRound } from 'lucide-react';

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  const shortText = text.replace(/\s+/g, ' ').slice(0, 120);
  throw new Error(
    `API JSON yerine farkli bir cevap dondu. Backend baglantisini kontrol edin. Detay: ${shortText}`,
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Sifreler eslesmiyor.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Kayit basarisiz.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/marketplace');
    } catch (err: any) {
      setError(err.message || 'Kayit islemi tamamlanamadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Hesap olustur</h1>
          <p className="mt-2 text-sm text-slate-600">3D model kesfi, uretim teklifi ve satici katalogu icin katilin.</p>
        </div>

        {error && (
          <div className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'USER' })}
              className={`rounded-2xl border p-4 text-left transition ${
                formData.role === 'USER'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <UserRound className="h-5 w-5" />
              <span className="mt-3 block font-semibold">Musteri</span>
              <span className="mt-1 block text-xs text-slate-500">Model kesfet ve teklif al</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'SELLER' })}
              className={`rounded-2xl border p-4 text-left transition ${
                formData.role === 'SELLER'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <Store className="h-5 w-5" />
              <span className="mt-3 block font-semibold">Satici</span>
              <span className="mt-1 block text-xs text-slate-500">Urun ekle ve teklif ver</span>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Ad soyad</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              required
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Ahmet Yilmaz"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">E-posta</label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              required
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="ornek@email.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Sifre</label>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                required
                minLength={6}
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="********"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Sifre tekrar</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Hesap olusturuluyor...' : 'Hesap olustur'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Zaten hesabiniz var mi?{' '}
          <Link href="/login" className="font-semibold text-emerald-800 hover:text-emerald-900">
            Giris yapin
          </Link>
        </p>
      </div>
    </div>
  );
}
