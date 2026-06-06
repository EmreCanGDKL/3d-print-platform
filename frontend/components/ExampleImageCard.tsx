'use client';

import Link from 'next/link';
import { ImageOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';

export type ExampleImageCardData = {
  id: string;
  title: string;
  imageUrl: string;
  source: string;
  sourceUrl?: string;
  description?: string;
  badge?: string;
  tags?: string[];
};

type ExampleImageCardProps = {
  item: ExampleImageCardData;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  fallbackLabel: string;
};

function isSafeImageUrl(value: string) {
  if (value.startsWith('/')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ExampleImageCard({
  item,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  fallbackLabel,
}: ExampleImageCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const canRenderImage = isSafeImageUrl(item.imageUrl);

  return (
    <article className="group flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
      <div className="relative aspect-square bg-stone-100">
        {imageFailed || !canRenderImage ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-500">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs font-semibold">{fallbackLabel}</span>
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-base font-bold leading-6 text-slate-950">{item.title}</h2>

        {item.tags && item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                {tag}
              </span>
            ))}
          </div>
        )}

        {item.description && <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{item.description}</p>}

        <div className="mt-auto pt-4">
          <div className="grid gap-2">
            <Link
              href={primaryHref}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Sparkles className="h-4 w-4" />
              {primaryLabel}
            </Link>
            {secondaryHref && secondaryLabel && (
              <Link
                href={secondaryHref}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-100"
              >
                <ShieldCheck className="h-4 w-4" />
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
