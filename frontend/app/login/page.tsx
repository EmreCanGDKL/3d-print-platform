'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Box } from 'lucide-react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

const copy = {
  tr: {
    nonJson: 'API beklenen JSON cevabını döndürmedi. Backend bağlantısını kontrol edin.',
    loginFailed: 'Giriş başarısız.',
    submitFailed: 'Giriş işlemi tamamlanamadı.',
    title: 'Giriş yap',
    description: 'Katalog, teklif ve AI model akışlarına devam edin.',
    email: 'E-posta',
    emailPlaceholder: 'ornek@email.com',
    password: 'Şifre',
    passwordPlaceholder: '********',
    loading: 'Giriş yapılıyor...',
    submit: 'Giriş yap',
    noAccount: 'Hesabınız yok mu?',
    register: 'Kayıt olun',
  },
  en: {
    nonJson: 'The API did not return the expected JSON response. Check the backend connection.',
    loginFailed: 'Login failed.',
    submitFailed: 'Login could not be completed.',
    title: 'Log in',
    description: 'Continue to catalog, quotes, and AI model workflows.',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    password: 'Password',
    passwordPlaceholder: '********',
    loading: 'Logging in...',
    submit: 'Log in',
    noAccount: "Don't have an account?",
    register: 'Sign up',
  },
};

type LoginResponse = {
  token?: string;
  user?: unknown;
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await readJsonResponse<LoginResponse>(response, text.nonJson);

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error || text.loginFailed);
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
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Box className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{text.description}</p>
        </div>

        {error && (
          <div className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{text.email}</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
              placeholder={text.emailPlaceholder}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">{text.password}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
              placeholder={text.passwordPlaceholder}
            />
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
          {text.noAccount}{' '}
          <Link href="/register" className="font-semibold text-emerald-800 hover:text-emerald-900">
            {text.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
