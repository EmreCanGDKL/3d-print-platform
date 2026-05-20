'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileImage, MessageSquare, Sparkles, Type, UsersRound } from 'lucide-react';
import { useAiGeneration } from '@/lib/ai-generation';
import { useLanguage } from '@/lib/language';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
});

type Seller = {
  id: string;
  name: string;
  email: string;
  activeProductCount: number;
};

const copy = {
  tr: {
    created: 'Model başarıyla oluşturuldu.',
    minPrompt: 'Modeli tarif eden en az birkaç kelimelik açıklama girin.',
    imageRequired: 'Referans görsel yükleyin.',
    preparing: 'Üretim görevi hazırlanıyor...',
    startError: 'Model üretimi başlatılamadı.',
    generateError: 'Model üretimi sırasında bir hata oluştu.',
    running: 'Üretim devam ediyor, bu işlem biraz uzun sürebilir...',
    failed: 'Model üretimi başarısız oldu.',
    stillRunning: 'Üretim hâlâ devam ediyor olabilir. Bir süre sonra aynı işlemi tekrar kontrol edelim.',
    studio: 'AI model stüdyosu',
    title: 'Fikrinizi 3D modele dönüştürün',
    description:
      'Metinle tarif edin veya referans görsel yükleyin. Üretilen model hazır olduğunda mesaj atacağınız satıcıyı seçebilirsiniz.',
    textMode: 'Metinden model',
    imageMode: 'Görselden model',
    promptLabel: 'Model açıklaması',
    promptPlaceholder:
      'Örn. Kablo düzenleyici kanalları olan, modern, mat yüzeyli masa üstü telefon standı...',
    imageLabel: 'Referans görsel',
    chooseFile: 'Dosya seç',
    noFile: 'Dosya seçilmedi',
    generating: 'Üretiliyor...',
    generatingDescription: 'Model arka planda hazırlanıyor. Bu sayfadan çıkıp katalogda gezmeye devam edebilirsiniz.',
    apiTimeout: 'Sunucudan beklenen sürede yanıt alınamadı. Üretim yoğun olabilir; lütfen biraz sonra tekrar deneyin.',
    create: 'Model oluştur',
    readyTitle: 'Model hazır',
    previewLoading: '3D önizleme hazırlanıyor...',
    sellerTitle: 'Mesaj göndereceğiniz satıcıyı seçin',
    sellerDescription: 'AI modeliniz için teklif almak istediğiniz satıcıyı seçip ayrı mesaj penceresini açın.',
    noSellers: 'Henüz mesaj gönderebileceğiniz satıcı bulunamadı.',
    products: 'aktif ürün',
    selected: 'Seçildi',
    messageSeller: 'Seçili satıcıya mesaj at',
    chooseSeller: 'Devam etmek için bir satıcı seçin.',
    tipsTitle: 'Daha iyi sonuç için',
    tips: [
      'Ölçü, kullanım alanı, yüzey tercihi ve parçanın dayanım beklentisini açık yazın.',
      'Görsel yüklerken sade arka planlı, tek objeli ve net ışıklı referanslar daha iyi çalışır.',
      'Üretimden önce satıcıyla malzeme, doluluk oranı ve teslim süresini konuşun.',
    ],
    sellerLoadError: 'Satıcı listesi alınamadı.',
  },
  en: {
    created: 'Model was created successfully.',
    minPrompt: 'Enter at least a few words describing the model.',
    imageRequired: 'Upload a reference image.',
    preparing: 'Preparing the generation task...',
    startError: 'Model generation could not be started.',
    generateError: 'An error occurred while generating the model.',
    running: 'Generation is still running. This may take a while...',
    failed: 'Model generation failed.',
    stillRunning: 'Generation may still be running. Check again in a while.',
    studio: 'AI model studio',
    title: 'Turn your idea into a 3D model',
    description:
      'Describe it with text or upload a reference image. When the model is ready, choose the seller you want to message.',
    textMode: 'Text to model',
    imageMode: 'Image to model',
    promptLabel: 'Model description',
    promptPlaceholder: 'Ex. A modern matte desktop phone stand with cable-management channels...',
    imageLabel: 'Reference image',
    chooseFile: 'Choose file',
    noFile: 'No file selected',
    generating: 'Generating...',
    generatingDescription: 'Your model is being prepared in the background. You can leave this page and keep browsing.',
    apiTimeout: 'The server did not respond in time. Generation may be busy; please try again shortly.',
    create: 'Create model',
    readyTitle: 'Model ready',
    previewLoading: 'Preparing 3D preview...',
    sellerTitle: 'Choose the seller to message',
    sellerDescription: 'Select a seller for a quote and open a separate message window for your AI model.',
    noSellers: 'There are no sellers you can message yet.',
    products: 'active products',
    selected: 'Selected',
    messageSeller: 'Message selected seller',
    chooseSeller: 'Choose a seller to continue.',
    tipsTitle: 'For better results',
    tips: [
      'Clearly describe dimensions, use case, surface preference, and strength expectations.',
      'For image uploads, clear single-object references with simple backgrounds work best.',
      'Before production, discuss material, infill, and delivery time with the seller.',
    ],
    sellerLoadError: 'Seller list could not be loaded.',
  },
};

export default function AIGenerator() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [mode, setMode] = useState<'text' | 'image'>('image');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [modelPreviewUrl, setModelPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [sellerError, setSellerError] = useState('');
  const {
    generating,
    generatedModelId,
    statusMessage,
    error,
    startGeneration,
    setGeneratedModelId,
    clearError,
    clearResult,
  } = useAiGeneration();

  useEffect(() => {
    void loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const modelId = new URLSearchParams(window.location.search).get('modelId');
    if (modelId) {
      setGeneratedModelId(modelId);
    }
  }, [setGeneratedModelId]);

  useEffect(() => {
    if (!generatedModelId) {
      setModelPreviewUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadPreview = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetchWithTimeout(`/api/models/file/${generatedModelId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, 30000);

        if (!response.ok) return;

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setModelPreviewUrl(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setModelPreviewUrl(null);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [generatedModelId]);

  const selectedSeller = useMemo(
    () => sellers.find((seller) => seller.id === selectedSellerId) || null,
    [selectedSellerId, sellers],
  );

  const loadSellers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetchWithTimeout('/api/chat/sellers', {
        headers: { Authorization: `Bearer ${token}` },
      }, 30000);
      const data = await readJsonResponse<{ items?: Seller[]; error?: string }>(response, text.apiTimeout);
      if (!response.ok) throw new Error(data.error || text.sellerLoadError);
      const items = data.items || [];
      setSellers(items);
      setSelectedSellerId((current) => {
        if (current && items.some((seller) => seller.id === current)) return current;
        return items.length === 1 ? items[0].id : '';
      });
    } catch (err: any) {
      setSellerError(err.message || text.sellerLoadError);
    }
  };

  const handleGenerate = async () => {
    clearError();
    clearResult();
    setValidationError('');

    if (mode === 'text' && prompt.trim().length < 8) {
      setValidationError(text.minPrompt);
      return;
    }
    if (mode === 'image' && !imageFile) {
      setValidationError(text.imageRequired);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    await startGeneration({
      mode,
      prompt,
      imageFile,
      token,
    });
  };

  const startChat = () => {
    if (!generatedModelId) return;
    if (!selectedSellerId) {
      setSellerError(text.chooseSeller);
      return;
    }

    router.push(
      `/chat/new?modelId=${encodeURIComponent(generatedModelId)}&type=AI&sellerId=${encodeURIComponent(selectedSellerId)}`,
    );
  };

  return (
    <div className="bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <Sparkles className="h-4 w-4" />
              {text.studio}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{text.title}</h1>
            <p className="mt-3 text-slate-600">{text.description}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {(error || validationError) && (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error || validationError}
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-stone-100 p-2">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'text' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Type className="h-4 w-4" />
              {text.textMode}
            </button>
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'image' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <FileImage className="h-4 w-4" />
              {text.imageMode}
            </button>
          </div>

          {mode === 'text' ? (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">{text.promptLabel}</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={text.promptPlaceholder}
                disabled={generating}
                className="h-40 w-full resize-none rounded-xl border border-stone-300 p-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">{text.imageLabel}</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                disabled={generating}
                hidden
                aria-hidden="true"
                tabIndex={-1}
                className="hidden"
              />
              <div className="flex min-h-14 items-center gap-3 rounded-xl border border-stone-300 bg-white p-3 text-sm">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={generating}
                  className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 font-semibold text-slate-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text.chooseFile}
                </button>
                <span className="min-w-0 truncate text-slate-600">{imageFile?.name || text.noFile}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || (mode === 'text' ? !prompt.trim() : !imageFile)}
            className="w-full rounded-xl bg-slate-950 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? text.generating : text.create}
          </button>

          {generating && (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{text.generating}</p>
                  <p className="mt-1 text-sm text-slate-600">{statusMessage || text.generatingDescription}</p>
                </div>
              </div>
            </div>
          )}

          {generatedModelId && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <h3 className="text-lg font-semibold text-emerald-950">{text.readyTitle}</h3>
              </div>
              <p className="mt-2 text-sm text-emerald-800">Model ID: {generatedModelId}</p>
              <div className="mt-5 h-72 overflow-hidden rounded-xl border border-emerald-200 bg-white">
                {modelPreviewUrl ? (
                  <ModelViewer src={modelPreviewUrl} className="h-full w-full" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-emerald-800">
                    {text.previewLoading}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <UsersRound className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div>
                    <h4 className="font-semibold text-slate-950">{text.sellerTitle}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{text.sellerDescription}</p>
                  </div>
                </div>

                {sellerError && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    {sellerError}
                  </div>
                )}

                {sellers.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-slate-600">{text.noSellers}</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {sellers.map((seller) => {
                      const active = seller.id === selectedSellerId;
                      return (
                        <button
                          key={seller.id}
                          type="button"
                          onClick={() => {
                            setSelectedSellerId(seller.id);
                            setSellerError('');
                          }}
                          className={`rounded-xl border p-4 text-left transition ${
                            active
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                              : 'border-stone-200 bg-white hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{seller.name}</span>
                            {active && <span className="text-xs font-bold text-emerald-700">{text.selected}</span>}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{seller.email}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-600">
                            {seller.activeProductCount} {text.products}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={startChat}
                  disabled={!selectedSeller}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  {text.messageSeller}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{text.tipsTitle}</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            {text.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
