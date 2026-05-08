import type { Metadata } from 'next';
import '@uploadthing/react/styles.css';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
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
        <Navbar />
        <main className="min-h-screen bg-stone-50">
          {children}
        </main>
      </body>
    </html>
  );
}
