'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Box, LogOut, Menu, Plus, ShoppingBag, ShoppingCart, UserRound, X } from 'lucide-react';
import { CART_CHANGED_EVENT, getCartItemCount } from '@/lib/cart';

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'SELLER';
};

const navLinks = [
  { href: '/marketplace', label: 'Katalog' },
  { href: '/ai-generator', label: 'AI Olu\u015Ftur' },
];

export function Navbar() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
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
      setNotificationCount(0);
      return;
    }

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/chat/notifications/summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { total?: number };
        if (!cancelled) setNotificationCount(data.total || 0);
      } catch {
        if (!cancelled) setNotificationCount(0);
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

  const initials = user?.name?.slice(0, 1).toLocaleUpperCase('tr-TR') || 'U';
  const roleLabel = user?.role === 'SELLER' ? 'Satici' : 'Musteri';

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
              <span className="desktop-subtitle text-xs text-slate-500">3D baski pazaryeri</span>
            </div>
          </Link>

          <div className="desktop-nav items-center justify-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            {user ? (
              <>
                {user.role === 'SELLER' && (
                  <Link
                    href="/seller/add-product"
                    className="desktop-action items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Urun ekle
                  </Link>
                )}
                <Link
                  href="/orders"
                  className="desktop-action relative items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
                >
                  {user.role === 'SELLER' ? <Bell className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                  {user.role === 'SELLER' ? 'Bildirimler' : 'Siparislerim'}
                  {notificationCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cart"
                  className="desktop-action relative items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Sepet
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-xs font-bold text-white">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Link>
                <div className="desktop-profile items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">
                    {initials}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="max-w-36 truncate text-sm font-bold text-slate-950">{user.name}</p>
                    <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-100"
                  aria-label="Cikis yap"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="desktop-text">Cikis</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center rounded-xl border border-stone-300 px-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-100 sm:px-4"
                >
                  Giris
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-4"
                >
                  Kayit ol
                </Link>
              </>
            )}

            <button
              type="button"
              className="mobile-menu-trigger h-10 w-10 items-center justify-center rounded-xl border border-stone-200"
              onClick={() => setOpen((value) => !value)}
              aria-label="Menuyu ac"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mobile-nav-panel space-y-2 border-t border-stone-200 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100"
              >
                {link.label}
              </Link>
            ))}
            {user?.role === 'SELLER' && (
              <Link
                href="/seller/add-product"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100"
              >
                Urun ekle
              </Link>
            )}
            {user && (
              <Link
                href="/orders"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100"
              >
                <span>{user.role === 'SELLER' ? 'Bildirimler' : 'Siparislerim'}</span>
                {notificationCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100"
            >
              <span>Sepet</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            {user && (
              <div className="rounded-xl bg-stone-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-500" />
                  <span className="truncate text-sm font-semibold text-slate-800">{user.name}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{roleLabel}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
