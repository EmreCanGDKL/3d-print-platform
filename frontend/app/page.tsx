import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            3D Baskı için <span className="text-blue-200">Akıllı Çözüm</span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Yapay zeka ile kendi 3D modelinizi oluşturun ve satıcılarla iletişime geçin
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login" className="bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition">
              Başla
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}