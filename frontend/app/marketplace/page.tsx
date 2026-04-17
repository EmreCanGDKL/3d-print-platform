'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  priceRangeMin: number;
  priceRangeMax: number;
  seller: {
    id: string;
    name: string;
    rating: number;
  };
}

export default function Marketplace() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setModels([
      {
        id: '1',
        name: 'Modern Vazo',
        description: 'Minimalist tasarım vazo',
        category: 'art',
        priceRangeMin: 150,
        priceRangeMax: 300,
        seller: { id: 's1', name: '3D Studio', rating: 4.8 },
      },
      {
        id: '2',
        name: 'Telefon Standı',
        description: 'Ayarlanabilir telefon tutucu',
        category: 'functional',
        priceRangeMin: 80,
        priceRangeMax: 150,
        seller: { id: 's2', name: 'PrintTech', rating: 4.5 },
      },
      {
        id: '3',
        name: 'Kaktüs Figür',
        description: 'Sevimli kaktüs figürü',
        category: 'figurine',
        priceRangeMin: 60,
        priceRangeMax: 120,
        seller: { id: 's3', name: 'MiniCraft', rating: 4.9 },
      },
    ]);
    setLoading(false);
  }, []);

  const handleQuote = (id: string) => {
    router.push(`/chat/new?modelId=${id}&type=catalog`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">3D Model Kataloğu</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <div key={model.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <h3 className="font-semibold text-lg mb-2">{model.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{model.description}</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                {model.seller.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{model.seller.name}</p>
                <p className="text-xs text-gray-500">⭐ {model.seller.rating}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                ₺{model.priceRangeMin} - ₺{model.priceRangeMax}
              </span>
              <button
                onClick={() => handleQuote(model.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
              >
                Teklif Al
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}