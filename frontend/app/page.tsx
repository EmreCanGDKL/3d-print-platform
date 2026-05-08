import Link from 'next/link';
import { ArrowRight, BadgeCheck, Box, Cpu, MessageSquare, Sparkles } from 'lucide-react';

const categories = ['Prototip', 'Endüstriyel parça', 'Dekor', 'Figür', 'Mimari maket'];

export default function Home() {
  return (
    <div className="bg-stone-50 text-slate-950">
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,#e7f0dc,transparent_32%),linear-gradient(135deg,#fffaf1_0%,#eef6f0_48%,#f7fbff_100%)]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-sm font-medium text-emerald-900 shadow-sm">
              <Sparkles className="h-4 w-4" />
              AI destekli 3D baskı pazaryeri
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Model fikrinden güvenilir üretim teklifine kadar tek platform.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Hazır 3D modelleri keşfedin, yapay zeka ile yeni modeller oluşturun ve doğrulanmış satıcılardan hızlı fiyat teklifi alın.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Kataloğu incele
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ai-generator"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
              >
                AI ile model oluştur
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['48 saat', 'ortalama teklif süreci'],
                ['GLB/GLTF', '3D önizleme desteği'],
                ['TRY', 'yerel fiyatlandırma'],
              ].map(([value, label]) => (
                <div key={value} className="border-l border-stone-300 pl-4">
                  <p className="text-2xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-sm text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
              <div className="aspect-[4/3] rounded-3xl border border-stone-200 bg-[linear-gradient(145deg,#172033,#31402f)] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-100">Model önizleme</p>
                    <h2 className="mt-1 text-2xl font-semibold">Ergonomik masa standı</h2>
                  </div>
                  <Box className="h-9 w-9 text-emerald-200" />
                </div>
                <div className="mt-10 grid grid-cols-3 gap-3">
                  <div className="col-span-2 h-44 rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="mx-auto h-full w-32 rounded-[42%] border border-emerald-200/60 bg-gradient-to-br from-emerald-200/70 via-stone-100/40 to-sky-200/30 shadow-2xl shadow-emerald-300/10" />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs text-slate-200">Malzeme</p>
                      <p className="mt-1 font-semibold">PLA+</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs text-slate-200">Teklif</p>
                      <p className="mt-1 font-semibold">₺420-₺680</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-200" />
                  <p className="text-sm text-slate-100">Satıcıya model, ölçü ve üretim notlarıyla birlikte iletildi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Cpu,
              title: 'AI ile başlangıç',
              text: 'Fikrinizi metin veya görsel referansla modele dönüştürün, sonucu teklif akışına taşıyın.',
            },
            {
              icon: Box,
              title: 'Katalogdan keşif',
              text: 'Satıcıların yüklediği hazır modelleri kategori, fiyat ve önizleme üzerinden karşılaştırın.',
            },
            {
              icon: MessageSquare,
              title: 'Teklif ve iletişim',
              text: 'Her model için satıcıyla konuşun, fiyat tekliflerini mesaj içinde düzenli takip edin.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <item.icon className="h-7 w-7 text-emerald-700" />
              <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-6 border-t border-stone-200 pt-10 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Popüler üretim kategorileri</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Prototipten dekoratif objelere kadar üretime hazır modelleri daha hızlı bulun.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/marketplace?category=${encodeURIComponent(category.toLowerCase())}`}
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:text-emerald-800"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
