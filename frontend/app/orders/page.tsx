"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, MessageSquare, PackageCheck, Truck, XCircle } from "lucide-react";

type StoredUser = {
  id: string;
  role: "USER" | "SELLER";
};

type OrderItem = {
  id: string;
  modelId: string;
  modelName: string | null;
  modelType: string;
  status: string;
  statusLabel: string;
  price: number;
  participant: {
    id: string;
    name: string;
    role: "seller" | "buyer";
  };
  latestMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

const orderStatuses = ["ORDERED", "PREPARING", "SHIPPED", "COMPLETED"];

const sellerActions = [
  { status: "PREPARING", label: "Hazirlaniyor" },
  { status: "SHIPPED", label: "Kargoya verildi" },
  { status: "COMPLETED", label: "Tamamlandi" },
];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    const token = getToken();
    if (!rawUser || !token) {
      router.replace("/login");
      return;
    }

    try {
      setUser(JSON.parse(rawUser) as StoredUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat/inbox/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { items?: OrderItem[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Siparisler alinamadi.");
      }

      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Siparisler alinamadi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadOrders();
  }, [loadOrders, user]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => item.status !== "ACTIVE" || item.unreadCount > 0);
  }, [items]);

  const updateStatus = async (id: string, status: string) => {
    const token = getToken();
    if (!token || updatingId) return;

    setUpdatingId(id);
    setError("");

    try {
      const response = await fetch(`/api/chat/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Durum guncellenemedi.");
      }

      await loadOrders();
    } catch (err: any) {
      setError(err.message || "Durum guncellenemedi.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-3xl items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          Siparisler yukleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {user?.role === "SELLER" ? "Satici bildirimleri" : "Musteri siparis takibi"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {user?.role === "SELLER" ? "Gelen siparisler" : "Siparislerim"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Siparis durumlari, okunmamis mesajlar ve satici/musteri iletisimleri burada toplanir.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-100"
        >
          Kataloga don
        </Link>
      </div>

      {error && (
        <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <PackageCheck className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">Henuz takip edilecek siparis yok</h2>
          <p className="mt-2 text-sm text-slate-600">
            Bir urun satin alindiginda veya size yeni mesaj geldiginde burada gorunur.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {visibleItems.map((item) => {
            const activeIndex = orderStatuses.indexOf(item.status);
            const isOrder = item.status !== "ACTIVE";
            return (
              <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">{item.modelName || "Urun"}</h2>
                      {item.unreadCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                          {item.unreadCount} yeni mesaj
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.participant.role === "seller" ? "Satici" : "Musteri"}: {item.participant.name}
                    </p>
                    {isOrder && (
                      <p className="mt-2 text-xl font-bold text-slate-950">
                        TL {item.price.toLocaleString("tr-TR")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/chat/${item.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-stone-100"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Mesajlar
                    </Link>
                    {user?.role === "USER" && isOrder && item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => void updateStatus(item.id, "CANCELLED")}
                        disabled={updatingId === item.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Iptal et
                      </button>
                    )}
                  </div>
                </div>

                {isOrder && (
                  <div className="mt-6">
                    <div className="grid gap-3 md:grid-cols-4">
                      {orderStatuses.map((status, index) => {
                        const reached = item.status === "CANCELLED" ? false : activeIndex >= index;
                        return (
                          <div
                            key={status}
                            className={`rounded-xl border p-3 ${
                              reached ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-stone-200 bg-stone-50 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {status === "SHIPPED" ? <Truck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              <span className="text-sm font-bold">{statusLabel(status)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {item.status === "CANCELLED" && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                        Siparis iptal edildi.
                      </div>
                    )}

                    {user?.role === "SELLER" && item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {sellerActions.map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            onClick={() => void updateStatus(item.id, action.status)}
                            disabled={updatingId === item.id || item.status === action.status}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {item.latestMessage && (
                  <div className="mt-5 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">
                    {item.latestMessage.content}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "ORDERED") return "Siparis alindi";
  if (status === "PREPARING") return "Hazirlaniyor";
  if (status === "SHIPPED") return "Kargoda";
  if (status === "COMPLETED") return "Tamamlandi";
  return status;
}
