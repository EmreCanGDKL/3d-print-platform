"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ShoppingCart, Trash2 } from "lucide-react";
import { CartItem, clearCart, readCart, removeFromCart } from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setItems(readCart());
  }, [router]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);

  const handleRemove = (id: string) => {
    setItems(removeFromCart(id));
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (items.length === 0 || ordering) return;

    setOrdering(true);
    setError("");
    setSuccess("");

    try {
      for (const item of items) {
        const response = await fetch("/api/chat/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ modelId: item.id }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `${item.name} icin siparis olusturulamadi.`);
        }
      }

      clearCart();
      setItems([]);
      setSuccess("Siparisler olusturuldu. Takip ekranina yonlendiriliyorsunuz...");
      router.push("/orders");
    } catch (err: any) {
      setError(err.message || "Siparis olusturulamadi.");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Alisveris sepeti</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sepetim</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Birden fazla urunu sepete ekleyip tek adimda siparis olusturabilirsiniz.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
        >
          Alisverise devam et
        </Link>
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

      {items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <ShoppingCart className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">Sepetiniz bos</h2>
          <p className="mt-2 text-sm text-slate-600">Katalogdan urunleri sepete ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto]">
                <div className="overflow-hidden rounded-xl bg-stone-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-28 w-full object-cover sm:h-full" />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs text-slate-500">Gorsel yok</div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">{item.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Satici: {item.seller.name}</p>
                </div>
                <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-xl font-bold text-slate-950">TL {item.price.toLocaleString("tr-TR")}</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Kaldir
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Siparis ozeti</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Urun adedi</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-3 text-base">
                <span className="font-bold text-slate-950">Toplam</span>
                <span className="font-bold text-slate-950">TL {total.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={ordering}
              className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ordering ? "Siparis olusturuluyor" : "Siparisi tamamla"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
