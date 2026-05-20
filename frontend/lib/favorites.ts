'use client';

export const FAVORITES_CHANGED_EVENT = 'printforge:favorites-changed';

const FAVORITES_STORAGE_KEY = 'printforge_favorites';

export type FavoriteItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  seller: {
    id: string;
    name: string;
  };
  categoryLabel?: string;
};

function readFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(items: FavoriteItem[]) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function getFavoriteItems() {
  return readFavorites();
}

export function getFavoriteIds() {
  return new Set(readFavorites().map((item) => item.id));
}

export function toggleFavorite(item: FavoriteItem) {
  const favorites = readFavorites();
  const exists = favorites.some((favorite) => favorite.id === item.id);

  if (exists) {
    writeFavorites(favorites.filter((favorite) => favorite.id !== item.id));
    return false;
  }

  writeFavorites([item, ...favorites]);
  return true;
}

export function removeFavorite(id: string) {
  writeFavorites(readFavorites().filter((favorite) => favorite.id !== id));
}
