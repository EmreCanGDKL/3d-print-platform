'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, FileImage, MessageSquare, Sparkles, Type } from 'lucide-react';

export default function AIGenerator() {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedModelId, setGeneratedModelId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setGeneratedModelId(null);

    if (mode === 'text' && prompt.trim().length < 8) {
      setError('Modeli tarif eden en az birkaç kelimelik açıklama girin.');
      return;
    }
    if (mode === 'image' && !imageFile) {
      setError('Referans görsel yükleyin.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setStatusMessage('Üretim görevi hazırlanıyor...');

    try {
      const formData = new FormData();
      formData.append('type', mode);

      if (mode === 'text') {
        formData.append('prompt', prompt.trim());
      } else if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Model üretimi başlatılamadı.');

      if (data.taskId) {
        await pollForResult(data.taskId, token);
      }
    } catch (err: any) {
      setError(err.message || 'Model üretimi sırasında bir hata oluştu.');
    } finally {
      setGenerating(false);
    }
  };

  const pollForResult = async (taskId: string, token: string) => {
    for (let i = 0; i < 60; i += 1) {
      const response = await fetch(`/api/ai/status/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }

      const status = await response.json();
      const nextProgress = Math.min(100, Math.round(status.progress || i * 2));
      setProgress(nextProgress);
      setStatusMessage(status.message || 'Üretim devam ediyor...');

      if (status.status === 'completed') {
        setGeneratedModelId(status.modelId);
        setProgress(100);
        setStatusMessage('Model başarıyla oluşturuldu.');
        return;
      }

      if (status.status === 'failed') {
        throw new Error(status.message || 'Model üretimi başarısız oldu.');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error('Üretim beklenenden uzun sürdü. Geçmişten tekrar kontrol edin.');
  };

  const startChat = () => {
    if (generatedModelId) {
      router.push(`/chat/new?modelId=${encodeURIComponent(generatedModelId)}&type=AI`);
    }
  };

  return (
    <div className="bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <Sparkles className="h-4 w-4" />
              AI model stüdyosu
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Fikrinizi 3D modele dönüştürün</h1>
            <p className="mt-3 text-slate-600">
              Metinle tarif edin veya referans görsel yükleyin. Üretilen model hazır olduğunda satıcıdan teklif isteyebilirsiniz.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {error && (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
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
              Metinden model
            </button>
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'image' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <FileImage className="h-4 w-4" />
              Görselden model
            </button>
          </div>

          {mode === 'text' ? (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Model açıklaması</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Örn. Kablo düzenleyici kanalları olan, modern, mat yüzeyli masa üstü telefon standı..."
                disabled={generating}
                className="h-40 w-full resize-none rounded-xl border border-stone-300 p-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Referans görsel</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                disabled={generating}
                className="w-full rounded-xl border border-stone-300 bg-white p-4 text-sm"
              />
              {imageFile && <p className="mt-2 text-sm text-slate-500">{imageFile.name}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || (mode === 'text' ? !prompt.trim() : !imageFile)}
            className="w-full rounded-xl bg-slate-950 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? `Üretiliyor... %${progress}` : 'Model oluştur'}
          </button>

          {(generating || generatedModelId) && (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">{statusMessage}</p>
            </div>
          )}

          {generatedModelId && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="text-lg font-semibold text-emerald-950">Model hazır</h3>
              <p className="mt-2 text-sm text-emerald-800">Model ID: {generatedModelId}</p>
              <button
                type="button"
                onClick={startChat}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <MessageSquare className="h-4 w-4" />
                Satıcıdan teklif al
              </button>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Daha iyi sonuç için</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>Ölçü, kullanım alanı, yüzey tercihi ve parçanın dayanım beklentisini açık yazın.</p>
            <p>Görsel yüklerken sade arka planlı, tek objeli ve net ışıklı referanslar daha iyi çalışır.</p>
            <p>Üretimden önce satıcıyla malzeme, doluluk oranı ve teslim süresini konuşun.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
