"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { UploadDropzone } from "@/utils/uploadthing";

const CATEGORIES = [
  { value: "art", label: "Sanat & dekor" },
  { value: "functional", label: "Fonksiyonel parçalar" },
  { value: "figurine", label: "Figürler" },
  { value: "mechanical", label: "Mekanik parçalar" },
  { value: "jewelry", label: "Aksesuar / mücevher" },
];

type StoredUser = {
  role?: string;
};

export default function AddProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("art");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");
    if (!token || !rawUser) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(rawUser) as StoredUser;
      setIsSeller(user.role === "SELLER");
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const pricePreview = useMemo(() => {
    const min = Number(priceMin);
    const max = Number(priceMax);
    if (!Number.isFinite(min) || min <= 0) return "Fiyat aralığı girin";
    if (!Number.isFinite(max) || max <= 0 || max === min) return `₺${min.toLocaleString("tr-TR")}`;
    return `₺${Math.min(min, max).toLocaleString("tr-TR")} - ₺${Math.max(min, max).toLocaleString("tr-TR")}`;
  }, [priceMax, priceMin]);

  const validateForm = () => {
    const min = Number(priceMin);
    const max = Number(priceMax || priceMin);

    if (!name.trim()) return "Ürün adı zorunludur.";
    if (description.trim().length < 20) return "Açıklama en az 20 karakter olmalıdır.";
    if (!Number.isFinite(min) || min <= 0) return "Geçerli bir minimum fiyat girin.";
    if (!Number.isFinite(max) || max <= 0) return "Geçerli bir maksimum fiyat girin.";
    return "";
  };

  const saveToDatabase = async (uploadedUrl: string) => {
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          priceMin: Number(priceMin),
          priceMax: Number(priceMax || priceMin),
          fileUrl: uploadedUrl,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || data.message || "Ürün kaydedilemedi.");
      }

      setSuccess("Ürün başarıyla kataloğa eklendi. Yönlendiriliyorsunuz...");
      router.push("/marketplace");
    } catch (err: any) {
      setError(err.message || "Sunucuya bağlanılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSeller) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-2xl items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Satıcı hesabı gerekli</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ürün eklemek için satıcı rolüyle giriş yapmanız gerekir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-800">Satıcı paneli</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Kataloğa ürün ekle</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            GLB veya GLTF modelinizi yükleyin. Onay sonrası ürününüz katalogda 3D önizlemeyle yayınlanır.
          </p>
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

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Ürün adı</label>
            <input
              type="text"
              value={name}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Örn. Ayarlanabilir telefon standı"
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Açıklama</label>
            <textarea
              rows={4}
              value={description}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Boyut, kullanım alanı, önerilen malzeme ve üretim notlarını yazın."
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Kategori</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Minimum fiyat</label>
              <input
                type="number"
                min={1}
                step={1}
                value={priceMin}
                placeholder="350"
                className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setPriceMin(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Maksimum fiyat</label>
              <input
                type="number"
                min={1}
                step={1}
                value={priceMax}
                placeholder="650"
                className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setPriceMax(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-100 pt-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-950">3D model dosyası</h2>
          <p className="mb-4 text-sm text-slate-600">Yalnızca .glb ve .gltf dosyaları kabul edilir.</p>
          {isSubmitting ? (
            <div className="flex h-44 items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50">
              <span className="font-medium text-emerald-900">Ürün kaydediliyor...</span>
            </div>
          ) : (
            <UploadDropzone
              endpoint="modelUploader"
              onClientUploadComplete={(res) => {
                const first = res.at(0);
                if (!first?.url) {
                  setError("Yükleme tamamlandı ancak dosya bağlantısı alınamadı.");
                  return;
                }
                void saveToDatabase(first.url);
              }}
              onUploadError={(uploadError: Error) => {
                setError(`Dosya yüklenemedi: ${uploadError.message}`);
              }}
              appearance={{
                container: () => "rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-4",
                label: ({ ready }) =>
                  ready ? "text-sm font-semibold text-slate-800" : "text-sm text-slate-500",
              }}
            />
          )}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <UploadCloud className="h-8 w-8 text-emerald-700" />
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Yayın önizlemesi</h2>
        <div className="mt-5 space-y-4 rounded-xl bg-stone-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ürün</p>
            <p className="mt-1 font-semibold text-slate-950">{name.trim() || "Ürün adı"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fiyat</p>
            <p className="mt-1 font-semibold text-slate-950">{pricePreview}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kategori</p>
            <p className="mt-1 font-semibold text-slate-950">{CATEGORIES.find((item) => item.value === category)?.label}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Açıklaması net, fiyat aralığı gerçekçi ve önizlemesi çalışan modeller daha hızlı teklif alır.
        </p>
      </aside>
    </div>
  );
}
