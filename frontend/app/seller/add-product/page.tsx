"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { UploadDropzone } from "@/utils/uploadthing";

const CATEGORIES = [
  { value: "art", label: "Sanat & dekor" },
  { value: "functional", label: "Fonksiyonel parcalar" },
  { value: "figurine", label: "Figurler" },
  { value: "mechanical", label: "Mekanik parcalar" },
  { value: "jewelry", label: "Aksesuar / mucevher" },
];

type StoredUser = {
  role?: string;
};

export default function AddProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("art");
  const [price, setPrice] = useState("");
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
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) return "Fiyat girin";
    return `TL ${amount.toLocaleString("tr-TR")}`;
  }, [price]);

  const validateForm = () => {
    const amount = Number(price);

    if (!name.trim()) return "Urun adi zorunludur.";
    if (description.trim().length < 10) return "Aciklama en az 10 karakter olmalidir.";
    if (!Number.isFinite(amount) || amount <= 0) return "Gecerli bir fiyat girin.";
    return "";
  };

  const saveToDatabase = async (uploadedUrls: string[]) => {
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (uploadedUrls.length === 0) {
      setError("En az bir urun gorseli yukleyin.");
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
          price: Number(price),
          imageUrls: uploadedUrls,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || data.message || "Urun kaydedilemedi.");
      }

      setSuccess("Urun basariyla kataloga eklendi. Yonlendiriliyorsunuz...");
      router.push("/marketplace");
    } catch (err: any) {
      setError(err.message || "Sunucuya baglanilamadi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSeller) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-2xl items-center justify-center px-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Satici hesabi gerekli</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Urun eklemek icin satici roluyle giris yapmaniz gerekir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-800">Satici paneli</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Kataloga urun ekle</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Urun gorsellerinizi yukleyin. Urunler tek fiyatla katalogda yayinlanir, pazarlik fiyati girilmez.
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
            <label className="mb-1 block text-sm font-semibold text-slate-700">Urun adi</label>
            <input
              type="text"
              value={name}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Orn. Ayarlanabilir telefon standi"
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Aciklama</label>
            <textarea
              rows={4}
              value={description}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Boyut, kullanim alani, onerilen malzeme ve uretim notlarini yazin."
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fiyat</label>
              <input
                type="number"
                min={1}
                step={1}
                value={price}
                placeholder="350"
                className="w-full rounded-xl border border-stone-300 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setPrice(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-100 pt-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-950">Urun gorselleri</h2>
          <p className="mb-4 text-sm text-slate-600">
            En fazla 5 gorsel yukleyebilirsiniz. AI model uretimi ayri sayfada aynen devam eder.
          </p>
          {isSubmitting ? (
            <div className="flex h-44 items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50">
              <span className="font-medium text-emerald-900">Urun kaydediliyor...</span>
            </div>
          ) : (
            <UploadDropzone
              endpoint="productImageUploader"
              onClientUploadComplete={(res) => {
                const urls = res.map((file) => file.url).filter(Boolean);
                if (urls.length === 0) {
                  setError("Yukleme tamamlandi ancak gorsel baglantisi alinamadi.");
                  return;
                }
                void saveToDatabase(urls);
              }}
              onUploadError={(uploadError: Error) => {
                setError(`Gorsel yuklenemedi: ${uploadError.message}`);
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
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Yayin onizlemesi</h2>
        <div className="mt-5 space-y-4 rounded-xl bg-stone-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Urun</p>
            <p className="mt-1 font-semibold text-slate-950">{name.trim() || "Urun adi"}</p>
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
          Aciklamasi net, fiyati tek ve gorselleri kaliteli urunler daha hizli ilgi gorur.
        </p>
      </aside>
    </div>
  );
}
