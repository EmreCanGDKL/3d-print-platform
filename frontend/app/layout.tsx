import type { Metadata } from 'next';
import '@uploadthing/react/styles.css';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { AiGenerationProvider } from '@/lib/ai-generation';
import { LanguageProvider } from '@/lib/language';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/printforge-mark.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/printforge-mark.svg',
    apple: '/printforge-mark.svg',
  },
  title: 'PrintForge | 3D Baskı Pazaryeri',
  description: 'AI destekli 3D model oluşturma, katalog keşfi ve satıcı teklif platformu.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <LanguageProvider>
          <AiGenerationProvider>
            <Navbar />
            <main className="min-h-screen bg-stone-50">{children}</main>
          </AiGenerationProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
