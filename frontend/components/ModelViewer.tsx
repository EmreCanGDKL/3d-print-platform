'use client';

import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';
import { Box } from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'camera-controls'?: boolean | string;
          'auto-rotate'?: boolean | string;
          'shadow-intensity'?: string;
          'interaction-prompt'?: string;
          exposure?: string;
        },
        HTMLElement
      >;
    }
  }
}

const MODEL_VIEWER_SCRIPT =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';

interface ModelViewerProps {
  src: string;
  className?: string;
}

export default function ModelViewer({ src, className }: ModelViewerProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const markReady = useCallback(async () => {
    try {
      await customElements.whenDefined('model-viewer');
      setReady(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (customElements.get('model-viewer')) {
      void markReady();
    }
  }, [markReady]);

  return (
    <div className={className ?? 'relative h-full w-full'}>
      <Script src={MODEL_VIEWER_SCRIPT} strategy="lazyOnload" onLoad={markReady} />
      {!ready || failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-emerald-50 text-center text-sm text-slate-500">
          <Box className="mb-2 h-8 w-8 text-slate-400" />
          {failed ? '3D önizleme yüklenemedi' : '3D önizleme yükleniyor...'}
        </div>
      ) : (
        <model-viewer
          src={src}
          alt="3D model önizlemesi"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          exposure="0.95"
          interaction-prompt="none"
          onError={() => setFailed(true)}
          className="block h-full w-full bg-transparent"
        />
      )}
    </div>
  );
}
