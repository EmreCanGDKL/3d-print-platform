'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Heart, ImageIcon, ShoppingCart, Trash2 } from 'lucide-react';
import { addToCart } from '@/lib/cart';
import { FAVORITES_CHANGED_EVENT, FavoriteItem, getFavoriteItems, removeFavorite } from '@/lib/favorites';
import { useLanguage } from '@/lib/language';

const copy = {
  tr: {
    title: 'Favorilerim',
    subtitle: 'Beğendiğiniz ürünleri burada saklayıp daha sonra hızlıca sepetinize ekleyebilirsiniz.',
    emptyTitle: 'Henüz favori ürün yok',
    emptyText: 'Katalogdaki ürünlerde kalp simgesine basarak favorilerinizi oluşturabilirsiniz.',
    browse: 'Kataloğu incele',
    remove: 'Kaldır',
    addToCart: 'Sepete ekle',
    added: 'Ürün sepete eklendi.',
    incremented: 'Sepetteki ürün adedi artırıldı.',
    seller: 'Satıcı',
    price: 'Fiyat',
    noImage: 'Görsel yok',
  },
  en: {
    title: 'Favorites',
    subtitle: 'Keep products you like here and add them to your cart quickly later.',
    emptyTitle: 'No favorite products yet',
    emptyText: 'Use the heart icon on catalog products to build your favorites.',
    browse: 'Browse catalog',
    remove: 'Remove',
    addToCart: 'Add to cart',
    added: 'Product added to cart.',
    incremented: 'Product quantity in cart was increased.',
    seller: 'Seller',
    price: 'Price',
    noImage: 'No image',
  },
};

export default function FavoritesPage() {
  const { language } = useLanguage();
  const text = copy[language];
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(getFavoriteItems());
    refresh();
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const handleRemove = (id: string) => {
    removeFavorite(id);
    setItems(getFavoriteItems());
  };

  const handleAddToCart = (item: FavoriteItem) => {
    const result = addToCart({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      quantity: 1,
      seller: item.seller,
    });

    window.alert(result.added ? text.added : text.incremented);
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-slate-950">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            {text.title}
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{text.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{text.subtitle}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Heart className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">{text.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{text.emptyText}</p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {text.browse}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="relative h-52 bg-stone-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">{text.noImage}</span>
                    </div>
                  )}
                  {item.categoryLabel ? (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {item.categoryLabel}
                    </span>
                  ) : null}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold text-slate-950">{item.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{text.seller}</p>
                      <p className="mt-1 truncate font-semibold text-slate-900">{item.seller.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">{text.price}</p>
                      <p className="mt-1 font-semibold text-slate-900">TL {item.price.toLocaleString(locale)}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      {text.remove}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {text.addToCart}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
