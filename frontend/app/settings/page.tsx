'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, KeyRound, Mail, UserRound } from 'lucide-react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

type StoredUser = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'SELLER';
  companyName?: string | null;
  displayName?: string;
};

type UserResponse = {
  user?: StoredUser;
  message?: string;
  error?: string;
};

const copy = {
  tr: {
    loading: 'Ayarlar yükleniyor...',
    title: 'Ayarlar',
    description: 'Hesap, iletişim ve profil bilgilerinizi buradan yönetin.',
    profileTitle: 'Profil bilgileri',
    profileDescription: 'Müşteri hesabında adınız, satıcı hesabında firma adınız görünür.',
    name: 'Ad soyad',
    companyName: 'Firma adı',
    saveProfile: 'Profili kaydet',
    emailTitle: 'E-posta',
    emailDescription: 'Giriş için kullandığınız e-posta adresini güncelleyin.',
    email: 'Yeni e-posta',
    currentPassword: 'Mevcut şifre',
    saveEmail: 'E-postayı güncelle',
    passwordTitle: 'Şifre',
    passwordDescription: 'Hesabınızı korumak için güçlü bir şifre kullanın.',
    newPassword: 'Yeni şifre',
    newPasswordAgain: 'Yeni şifre tekrar',
    savePassword: 'Şifreyi güncelle',
    passwordMismatch: 'Yeni şifreler eşleşmiyor.',
    profileSaved: 'Profil bilgileri güncellendi.',
    emailSaved: 'E-posta güncellendi.',
    passwordSaved: 'Şifre güncellendi.',
    fallbackError: 'İşlem tamamlanamadı.',
    apiFallback: 'API cevabı okunamadı. Backend bağlantısını kontrol edin.',
    saving: 'Kaydediliyor...',
  },
  en: {
    loading: 'Loading settings...',
    title: 'Settings',
    description: 'Manage your account, contact, and profile details here.',
    profileTitle: 'Profile details',
    profileDescription: 'Customers show their name; sellers show their company name.',
    name: 'Full name',
    companyName: 'Company name',
    saveProfile: 'Save profile',
    emailTitle: 'Email',
    emailDescription: 'Update the email address you use to log in.',
    email: 'New email',
    currentPassword: 'Current password',
    saveEmail: 'Update email',
    passwordTitle: 'Password',
    passwordDescription: 'Use a strong password to protect your account.',
    newPassword: 'New password',
    newPasswordAgain: 'Repeat new password',
    savePassword: 'Update password',
    passwordMismatch: 'New passwords do not match.',
    profileSaved: 'Profile details were updated.',
    emailSaved: 'Email was updated.',
    passwordSaved: 'Password was updated.',
    fallbackError: 'The action could not be completed.',
    apiFallback: 'The API response could not be read. Check the backend connection.',
    saving: 'Saving...',
  },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function SettingsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [user, setUser] = useState<StoredUser | null>(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordAgain, setNewPasswordAgain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const syncUser = (nextUser: StoredUser) => {
    setUser(nextUser);
    setName(nextUser.name || '');
    setCompanyName(nextUser.companyName || '');
    setEmail(nextUser.email || '');
    localStorage.setItem('user', JSON.stringify(nextUser));
    window.dispatchEvent(new Event('auth-changed'));
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const loadUser = async () => {
      try {
        const response = await fetchWithTimeout('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readJsonResponse<UserResponse>(response, text.apiFallback);
        if (!response.ok || !data.user) throw new Error(data.error || text.fallbackError);
        syncUser(data.user);
      } catch (err: any) {
        setError(err.message || text.fallbackError);
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getToken();
    if (!token || saving) return;

    setSaving('profile');
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, companyName }),
      });
      const data = await readJsonResponse<UserResponse>(response, text.apiFallback);
      if (!response.ok || !data.user) throw new Error(data.error || text.fallbackError);
      syncUser(data.user);
      setSuccess(data.message || text.profileSaved);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setSaving('');
    }
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getToken();
    if (!token || saving) return;

    setSaving('email');
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout('/api/auth/email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, currentPassword: emailPassword }),
      });
      const data = await readJsonResponse<UserResponse>(response, text.apiFallback);
      if (!response.ok || !data.user) throw new Error(data.error || text.fallbackError);
      syncUser(data.user);
      setEmailPassword('');
      setSuccess(data.message || text.emailSaved);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setSaving('');
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getToken();
    if (!token || saving) return;

    if (newPassword !== newPasswordAgain) {
      setError(text.passwordMismatch);
      setSuccess('');
      return;
    }

    setSaving('password');
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithTimeout('/api/auth/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await readJsonResponse<UserResponse>(response, text.apiFallback);
      if (!response.ok) throw new Error(data.error || text.fallbackError);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordAgain('');
      setSuccess(data.message || text.passwordSaved);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setSaving('');
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">{text.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text.description}</p>
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

      <div className="grid gap-6">
        <form onSubmit={submitProfile} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <UserRound className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{text.profileTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{text.profileDescription}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.name}</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            {user?.role === 'SELLER' && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{text.companyName}</label>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving !== ''}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving === 'profile' ? text.saving : text.saveProfile}
          </button>
        </form>

        <form onSubmit={submitEmail} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <Mail className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{text.emailTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{text.emailDescription}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.email}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.currentPassword}</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving !== ''}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving === 'email' ? text.saving : text.saveEmail}
          </button>
        </form>

        <form onSubmit={submitPassword} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <KeyRound className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{text.passwordTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{text.passwordDescription}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.currentPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.newPassword}</label>
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{text.newPasswordAgain}</label>
              <input
                type="password"
                minLength={6}
                value={newPasswordAgain}
                onChange={(event) => setNewPasswordAgain(event.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving !== ''}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving === 'password' ? text.saving : text.savePassword}
          </button>
        </form>
      </div>
    </div>
  );
}
