'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Store, UserRound } from 'lucide-react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

const copy = {
  tr: {
    nonJson: 'API beklenen JSON cevabını döndürmedi. Backend bağlantısını kontrol edin.',
    passwordsMismatch: 'Şifreler eşleşmiyor.',
    registerFailed: 'Kayıt başarısız.',
    submitFailed: 'Kayıt işlemi tamamlanamadı.',
    title: 'Hesap oluştur',
    description: '3D model keşfi, üretim teklifi ve satıcı kataloğu için katılın.',
    customer: 'Müşteri',
    customerHelp: 'Model keşfet ve teklif al',
    seller: 'Satıcı',
    sellerHelp: 'Ürün ekle ve teklif ver',
    name: 'Ad soyad',
    namePlaceholder: 'Ahmet Yılmaz',
    companyName: 'Firma adı',
    companyNamePlaceholder: 'Örn. Gedikli 3D Baskı',
    email: 'E-posta',
    emailPlaceholder: 'ornek@email.com',
    password: 'Şifre',
    passwordRepeat: 'Şifre tekrar',
    passwordPlaceholder: '********',
    loading: 'Hesap oluşturuluyor...',
    submit: 'Hesap oluştur',
    hasAccount: 'Zaten hesabınız var mı?',
    login: 'Giriş yapın',
  },
  en: {
    nonJson: 'The API did not return the expected JSON response. Check the backend connection.',
    passwordsMismatch: 'Passwords do not match.',
    registerFailed: 'Registration failed.',
    submitFailed: 'Registration could not be completed.',
    title: 'Create account',
    description: 'Join for 3D model discovery, production quotes, and seller catalogs.',
    customer: 'Customer',
    customerHelp: 'Discover models and request quotes',
    seller: 'Seller',
    sellerHelp: 'Add products and send quotes',
    name: 'Full name',
    namePlaceholder: 'Alex Taylor',
    companyName: 'Company name',
    companyNamePlaceholder: 'Ex. ForgeWorks Studio',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    password: 'Password',
    passwordRepeat: 'Repeat password',
    passwordPlaceholder: '********',
    loading: 'Creating account...',
    submit: 'Create account',
    hasAccount: 'Already have an account?',
    login: 'Log in',
  },
};

type RegisterResponse = {
  token?: string;
  user?: unknown;
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    role: 'USER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(text.passwordsMismatch);
      setLoading(false);
      return;
    }

    try {
      const response = await fetchWithTimeout('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          companyName: formData.role === 'SELLER' ? formData.companyName : undefined,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await readJsonResponse<RegisterResponse>(response, text.nonJson);

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error || text.registerFailed);
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/marketplace');
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.nonJson : err.message || text.submitFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{text.description}</p>
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
              disabled={loading}
              className={`rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
                formData.role === 'USER'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <UserRound className="h-5 w-5" />
              <span className="mt-3 block font-semibold">{text.customer}</span>
              <span className="mt-1 block text-xs text-slate-500">{text.customerHelp}</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'SELLER' })}
              disabled={loading}
              className={`rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
                formData.role === 'SELLER'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <Store className="h-5 w-5" />
              <span className="mt-3 block font-semibold">{text.seller}</span>
              <span className="mt-1 block text-xs text-slate-500">{text.sellerHelp}</span>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{text.name}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              required
              disabled={loading}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
              placeholder={text.namePlaceholder}
            />
          </div>

          {formData.role === 'SELLER' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.companyName}</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
                required
                disabled={loading}
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
                placeholder={text.companyNamePlaceholder}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{text.email}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              required
              disabled={loading}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
              placeholder={text.emailPlaceholder}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.password}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                required
                minLength={6}
                disabled={loading}
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
                placeholder={text.passwordPlaceholder}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.passwordRepeat}</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                required
                disabled={loading}
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
                placeholder={text.passwordPlaceholder}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? text.loading : text.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {text.hasAccount}{' '}
          <Link href="/login" className="font-semibold text-emerald-800 hover:text-emerald-900">
            {text.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
