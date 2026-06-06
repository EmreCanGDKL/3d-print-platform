'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  FlaskConical,
  Gauge,
  ImageIcon,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

type DefectResult = {
  key: string;
  label: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  recommendations: string[];
  source: 'trained-model' | 'demo-heuristic';
  error?: string;
};

type ReferenceMeta = {
  title: string;
  source: string;
  query: string;
  prompt: string;
  imageUrl: string;
};

function convertReferenceBlobToPng(blob: Blob, fileName: string) {
  return new Promise<File>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 640;
      canvas.height = image.naturalHeight || 640;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas could not be created.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(objectUrl);
        if (!pngBlob) {
          reject(new Error('Image could not be converted.'));
          return;
        }
        resolve(new File([pngBlob], fileName, { type: 'image/png' }));
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be loaded.'));
    };

    image.src = objectUrl;
  });
}

function buildAiHref(reference: ReferenceMeta | null, result: DefectResult | null) {
  if (!reference) return '/ai-generator';

  const qualityNote = result
    ? ` Kalite kontrol notu: ${result.label}. Öneriler: ${result.recommendations.slice(0, 2).join(' ')}`
    : '';
  const params = new URLSearchParams({
    imageUrl: reference.imageUrl,
    prompt: `${reference.prompt}${qualityNote}`.trim(),
    title: reference.title,
    source: reference.source,
    query: reference.query,
  });

  return `/ai-generator?${params.toString()}`;
}

const copy = {
  tr: {
    eyebrow: 'PrintForge Quality AI',
    title: 'Baskı Kalite Kontrol',
    description:
      'FDM baskı fotoğrafı yükleyin; sistem olası hata türünü, güven skorunu ve çözüm önerilerini göstersin.',
    uploadTitle: 'Baskı fotoğrafı',
    uploadText: 'Tek objeli, net ışıklı ve hatalı bölgeyi yakın gösteren fotoğraf daha iyi sonuç verir.',
    choose: 'Fotoğraf seç',
    analyze: 'Analiz et',
    analyzing: 'Analiz ediliyor...',
    selectedExample: 'Seçilen referans',
    sendToAi: 'AI model oluşturmaya gönder',
    sendToAiAfterResult: 'Analiz sonucuyla AI model oluştur',
    noFile: 'Henüz fotoğraf seçilmedi',
    result: 'Analiz sonucu',
    confidence: 'Güven skoru',
    severity: 'Önem',
    source: 'Model kaynağı',
    trained: 'Eğitilmiş model',
    demo: 'Demo tahmin',
    recommendations: 'Çözüm önerileri',
    emptyResult: 'Fotoğraf yüklediğinizde kalite analizi burada görünecek.',
    fileRequired: 'Önce bir baskı fotoğrafı seçin.',
    failed: 'Baskı kalite analizi yapılamadı.',
    imageLoadFailed: 'Referans görsel kalite kontrole alınamadı. Görseli manuel yükleyebilirsiniz.',
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    learnTitle: 'Eğitilebilir yapı',
    learnText:
      'Bu ekran, eğitim tamamlanana kadar demo tahmin modunda çalışır. Eğitilmiş Python model servisini bağladığında aynı ekran gerçek model sonucunu gösterir.',
    supportedTitle: 'Hata sınıfları',
    supportedItems: ['Warping', 'Stringing', 'Layer shifting', 'Cracking', 'Off-platform'],
  },
  en: {
    eyebrow: 'PrintForge Quality AI',
    title: 'Print Quality Control',
    description: 'Upload an FDM print photo to detect likely defect type, confidence, and practical fixes.',
    uploadTitle: 'Print photo',
    uploadText: 'A clear single-object image with the defect area visible gives better results.',
    choose: 'Choose photo',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    selectedExample: 'Selected reference',
    sendToAi: 'Send to AI model generation',
    sendToAiAfterResult: 'Create AI model with analysis',
    noFile: 'No photo selected yet',
    result: 'Analysis result',
    confidence: 'Confidence',
    severity: 'Severity',
    source: 'Model source',
    trained: 'Trained model',
    demo: 'Demo estimate',
    recommendations: 'Recommendations',
    emptyResult: 'The quality analysis will appear here after you upload a photo.',
    fileRequired: 'Choose a print photo first.',
    failed: 'Print quality analysis failed.',
    imageLoadFailed: 'Reference image could not be prepared for quality check. You can upload it manually.',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    learnTitle: 'Trainable structure',
    learnText:
      'Until training is complete, this screen runs in demo mode. When you connect the trained Python model service, the same screen shows real model output.',
    supportedTitle: 'Defect classes',
    supportedItems: ['Warping', 'Stringing', 'Layer shifting', 'Cracking', 'Off-platform'],
  },
};

export default function PrintQualityPage() {
  const { language } = useLanguage();
  const text = copy[language];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [referenceMeta, setReferenceMeta] = useState<ReferenceMeta | null>(null);
  const [referenceLoadError, setReferenceLoadError] = useState('');
  const [result, setResult] = useState<DefectResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const severityLabel = useMemo(() => {
    if (!result) return '';
    return result.severity === 'high' ? text.high : result.severity === 'medium' ? text.medium : text.low;
  }, [result, text.high, text.low, text.medium]);
  const aiHref = useMemo(() => buildAiHref(referenceMeta, result), [referenceMeta, result]);

  const handleFile = (nextFile: File | null) => {
    setFile(nextFile);
    setReferenceMeta(null);
    setReferenceLoadError('');
    setResult(null);
    setError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : '');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get('imageUrl') || '';
    const title = params.get('title') || '';
    const source = params.get('source') || params.get('category') || '';
    const query = params.get('query') || '';
    const prompt =
      params.get('prompt') ||
      (title
        ? `Bu referans görsele benzer, 3D baskıya uygun, temiz yüzeyli, STL/3MF üretimine uygun bir 3D model oluştur: ${title}. Arama konusu: ${query || source}.`
        : '');

    if (!imageUrl) return;

    const reference: ReferenceMeta = {
      imageUrl,
      title: title || 'Referans görsel',
      source,
      query,
      prompt,
    };
    const displayUrl = imageUrl.startsWith('/') ? imageUrl : `/api/examples/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    let cancelled = false;
    let objectUrl = '';

    setReferenceMeta(reference);
    setReferenceLoadError('');
    setResult(null);
    setPreviewUrl(displayUrl);

    const prepareReference = async () => {
      try {
        const response = await fetchWithTimeout(displayUrl, {}, 30000);
        if (!response.ok) throw new Error(text.imageLoadFailed);
        const blob = await response.blob();
        const fileName = `${reference.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'reference'}.png`;
        const nextFile = await convertReferenceBlobToPng(blob, fileName);
        objectUrl = URL.createObjectURL(nextFile);
        if (!cancelled) {
          setFile(nextFile);
          setPreviewUrl(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setFile(null);
          setReferenceLoadError(text.imageLoadFailed);
        }
      }
    };

    void prepareReference();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [text.imageLoadFailed]);

  const analyze = async () => {
    if (!file) {
      setError(text.fileRequired);
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    setError('');

    try {
      const response = await fetchWithTimeout(
        '/api/print-quality/analyze',
        {
          method: 'POST',
          body: formData,
        },
        130000,
      );
      const data = await readJsonResponse<DefectResult>(response, text.failed);
      if (!response.ok) throw new Error(data.error || text.failed);
      setResult(data);
    } catch (err: any) {
      setError(err.name === 'AbortError' ? text.failed : err.message || text.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-slate-950">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-900">
              <Sparkles className="h-4 w-4" />
              {text.eyebrow}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{text.title}</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{text.description}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          {error && (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}
          {referenceLoadError && (
            <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {referenceLoadError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{text.uploadTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text.uploadText}</p>
              {referenceMeta && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-bold uppercase text-emerald-800">{text.selectedExample}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{referenceMeta.title}</p>
                  {referenceMeta.source && <p className="mt-0.5 text-xs text-slate-600">{referenceMeta.source}</p>}
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => handleFile(event.target.files?.[0] || null)}
              />

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-stone-100"
              >
                <ImageIcon className="h-4 w-4" />
                {text.choose}
              </button>

              <p className="mt-3 truncate text-sm font-medium text-slate-500">{file?.name || text.noFile}</p>

              <button
                type="button"
                onClick={() => void analyze()}
                disabled={!file || loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {loading ? text.analyzing : text.analyze}
              </button>
              {referenceMeta && (
                <Link
                  href={aiHref}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-4 text-sm font-bold text-slate-800 transition hover:bg-stone-100"
                >
                  <Sparkles className="h-4 w-4" />
                  {result ? text.sendToAiAfterResult : text.sendToAi}
                </Link>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
              {previewUrl ? (
                <img src={previewUrl} alt={file?.name || text.uploadTitle} className="h-full min-h-80 w-full object-contain" />
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center text-sm font-semibold text-slate-500">
                  <ImageIcon className="mb-3 h-10 w-10 text-slate-400" />
                  {text.noFile}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-950">{text.result}</h2>
            </div>

            {result ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    {result.severity === 'low' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-amber-700" />
                    )}
                    <p className="font-bold text-slate-950">{result.label}</p>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <p className="flex justify-between gap-3">
                      <span className="text-slate-500">{text.confidence}</span>
                      <span className="font-bold text-slate-950">{Math.round(result.confidence * 100)}%</span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-slate-500">{text.severity}</span>
                      <span className="font-bold text-slate-950">{severityLabel}</span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-slate-500">{text.source}</span>
                      <span className="font-bold text-slate-950">
                        {result.source === 'trained-model' ? text.trained : text.demo}
                      </span>
                    </p>
                  </div>
                  {referenceMeta && (
                    <Link
                      href={aiHref}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <Sparkles className="h-4 w-4" />
                      {text.sendToAiAfterResult}
                    </Link>
                  )}
                </div>

                <div>
                  <p className="text-sm leading-6 text-slate-700">{result.summary}</p>
                  <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-500">{text.recommendations}</h3>
                  <div className="mt-3 grid gap-3">
                    {result.recommendations.map((item) => (
                      <div key={item} className="rounded-xl border border-stone-200 bg-white p-3 text-sm leading-6 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">{text.emptyResult}</p>
            )}
          </div>
        </section>

        <aside className="h-fit space-y-5">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-emerald-700" />
              <h2 className="font-bold text-slate-950">{text.learnTitle}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text.learnText}</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-emerald-700" />
              <h2 className="font-bold text-slate-950">{text.supportedTitle}</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {text.supportedItems.map((item) => (
                <div key={item} className="rounded-xl bg-stone-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
