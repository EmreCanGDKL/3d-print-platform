'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Box,
  ChevronDown,
  CheckCircle2,
  Heart,
  Languages,
  Loader2,
  LogOut,
  MessageSquare,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from 'lucide-react';
import { useAiGeneration } from '@/lib/ai-generation';
import { apiUrl } from '@/lib/api';
import { CART_CHANGED_EVENT, getCartItemCount } from '@/lib/cart';
import { useLanguage } from '@/lib/language';

type StoredUser = {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  displayName?: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
};

const copy = {
  tr: {
    subtitle: '3D baskı pazaryeri',
    catalog: 'Katalog',
    examples: 'Örnekler',
    aiCreate: 'AI Oluştur',
    messages: 'Mesajlar',
    addProduct: 'Ürün ekle',
    myProducts: 'Ürünlerim',
    favorites: 'Favorilerim',
    notifications: 'Bildirimler',
    orders: 'Siparişlerim',
    cart: 'Sepet',
    settings: 'Ayarlar',
    adminExamples: 'Örnek yönetimi',
    login: 'Giriş',
    register: 'Kayıt ol',
    logout: 'Çıkış',
    logoutAria: 'Çıkış yap',
    menuAria: 'Menüyü aç',
    seller: 'Satıcı',
    customer: 'Müşteri',
    languageAria: 'Dili değiştir',
    languageLabel: 'EN',
    aiGenerating: 'Üretiliyor',
    aiReady: 'Model hazır',
  },
  en: {
    subtitle: '3D printing marketplace',
    catalog: 'Catalog',
    examples: 'Examples',
    aiCreate: 'Create with AI',
    messages: 'Messages',
    addProduct: 'Add product',
    myProducts: 'My products',
    favorites: 'Favorites',
    notifications: 'Notifications',
    orders: 'My orders',
    cart: 'Cart',
    settings: 'Settings',
    adminExamples: 'Example management',
    login: 'Log in',
    register: 'Sign up',
    logout: 'Log out',
    logoutAria: 'Log out',
    menuAria: 'Open menu',
    seller: 'Seller',
    customer: 'Customer',
    languageAria: 'Change language',
    languageLabel: 'TR',
    aiGenerating: 'Generating',
    aiReady: 'Model ready',
  },
};

export function Navbar() {
  const { language, toggleLanguage } = useLanguage();
  const { generating, generatedModelId } = useAiGeneration();
  const text = copy[language];
  const navLinks = [
    { href: '/marketplace', label: text.catalog },
    { href: '/examples', label: text.examples },
    { href: '/ai-generator', label: text.aiCreate },
  ];

  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [orderNotifications, setOrderNotifications] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  const refreshUser = useCallback(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      setUser(null);
      return;
    }

    try {
      setUser(JSON.parse(userData) as StoredUser);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [pathname, refreshUser]);

  useEffect(() => {
    const refreshCart = () => setCartCount(getCartItemCount());
    refreshCart();
    window.addEventListener(CART_CHANGED_EVENT, refreshCart);
    window.addEventListener('storage', refreshCart);

    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, refreshCart);
      window.removeEventListener('storage', refreshCart);
    };
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      setUnreadMessages(0);
      setOrderNotifications(0);
      return;
    }

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const response = await fetch(apiUrl('/api/chat/notifications/summary'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { unreadCount?: number; sellerOrderCount?: number };
        if (!cancelled) {
          setUnreadMessages(data.unreadCount || 0);
          setOrderNotifications(data.sellerOrderCount || 0);
        }
      } catch {
        if (!cancelled) {
          setUnreadMessages(0);
          setOrderNotifications(0);
        }
      }
    };

    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname, user]);

  useEffect(() => {
    window.addEventListener('focus', refreshUser);
    window.addEventListener('storage', refreshUser);
    window.addEventListener('auth-changed', refreshUser);

    return () => {
      window.removeEventListener('focus', refreshUser);
      window.removeEventListener('storage', refreshUser);
      window.removeEventListener('auth-changed', refreshUser);
    };
  }, [refreshUser]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (pathname === '/') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.replaceState(null, '', '/');
    }
  };

  const initials = user?.name?.slice(0, 1).toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US') || 'U';
  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : user?.role === 'SELLER' ? text.seller : text.customer;
  const profileName = user?.role === 'SELLER' ? user.companyName || user.displayName || user.name : user?.name;

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 shadow-sm shadow-slate-900/[0.03] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4">
          <Link href="/" className="flex items-center gap-3" onClick={handleLogoClick}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Box className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-slate-950">PrintForge</span>
              <span className="desktop-subtitle text-xs text-slate-500">{text.subtitle}</span>
            </div>
          </Link>

          <div className="desktop-nav items-center justify-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                  link.href === '/ai-generator'
                    ? 'bg-slate-950 text-white hover:bg-slate-800'
                    : 'border border-stone-300 bg-white text-slate-800 hover:bg-stone-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {(generating || generatedModelId) && (
              <Link
                href="/ai-generator"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {generating ? text.aiGenerating : text.aiReady}
              </Link>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-stone-100"
              aria-label={text.languageAria}
            >
              <Languages className="h-4 w-4" />
              {text.languageLabel}
            </button>

            {user && (
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden lg:inline">{text.messages}</span>
                {unreadMessages > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            )}

            {user && (
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden lg:inline">{text.cart}</span>
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            <div className="relative">
              {user ? (
                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  className="inline-flex h-12 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-left shadow-sm transition hover:bg-stone-100"
                  aria-label={text.menuAria}
                  aria-expanded={open}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">
                    {initials}
                  </div>
                  <div className="profile-trigger-text min-w-0 leading-tight">
                    <p className="max-w-36 truncate text-sm font-bold text-slate-950">{profileName}</p>
                    <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
                  aria-label={text.menuAria}
                  aria-expanded={open}
                >
                  <UserRound className="h-4 w-4" />
                  {text.login}
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
                </button>
              )}

              {open && (
                <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-72 rounded-xl border border-stone-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
                  <span className="absolute right-9 top-[-6px] h-3 w-3 rotate-45 border-l border-t border-stone-200 bg-white" />
                  {user && (
                    <div className="mb-1 rounded-lg bg-stone-50 px-3 py-3">
                      <p className="truncate text-sm font-bold text-slate-950">{profileName}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{roleLabel}</p>
                    </div>
                  )}
                  {!user && (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                      >
                        <UserRound className="h-4 w-4 text-slate-500" />
                        {text.login}
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                      >
                        <UserRound className="h-4 w-4 text-slate-500" />
                        {text.register}
                      </Link>
                    </>
                  )}
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100 sm:hidden"
                    >
                      <Box className="h-4 w-4 text-slate-500" />
                      {link.label}
                    </Link>
                  ))}
                  {(generating || generatedModelId) && (
                    <Link
                      href="/ai-generator"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {generating ? text.aiGenerating : text.aiReady}
                    </Link>
                  )}
                  {user?.role === 'SELLER' && (
                    <Link
                      href="/seller/products"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <ShoppingBag className="h-4 w-4 text-slate-500" />
                      {text.myProducts}
                    </Link>
                  )}
                  {user?.role === 'SELLER' && (
                    <Link
                      href="/seller/add-product"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <Box className="h-4 w-4 text-slate-500" />
                      {text.addProduct}
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin/examples"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      {text.adminExamples}
                    </Link>
                  )}
                  {user && (
                    <Link
                      href="/favorites"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <Heart className="h-4 w-4 text-slate-500" />
                      {text.favorites}
                    </Link>
                  )}
                  {user && (
                    <Link
                      href="/messages"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <span className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                        {text.messages}
                      </span>
                      {unreadMessages > 0 && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </Link>
                  )}
                  {user && (
                    <Link
                      href="/orders"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <span className="flex items-center gap-3">
                        {user.role === 'SELLER' ? (
                          <Bell className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-slate-500" />
                        )}
                        {user.role === 'SELLER' ? text.notifications : text.orders}
                      </span>
                      {orderNotifications > 0 && (
                        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                          {orderNotifications > 9 ? '9+' : orderNotifications}
                        </span>
                      )}
                    </Link>
                  )}
                  {user && (
                    <Link
                      href="/cart"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <span className="flex items-center gap-3">
                        <ShoppingCart className="h-4 w-4 text-slate-500" />
                        {text.cart}
                      </span>
                      {cartCount > 0 && (
                        <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {user && (
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      {text.settings}
                    </Link>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-stone-100"
                    >
                      <LogOut className="h-4 w-4 text-slate-500" />
                      {text.logout}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
