import MarketplaceCatalog, { type CatalogModel } from './MarketplaceCatalog';

export const dynamic = 'force-dynamic';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

type BackendCatalogModel = {
  id: string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  modelUrl?: string | null;
  imageUrls?: string[] | null;
  viewerDataKey?: string | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  seller?: {
    id?: string;
    name?: string;
  };
  user?: {
    id?: string;
    name?: string;
  };
};

const categoryLabels: Record<string, string> = {
  art: 'Sanat ve dekor',
  functional: 'Fonksiyonel parca',
  figurine: 'Figur',
  mechanical: 'Mekanik parca',
  jewelry: 'Aksesuar',
};

export default async function MarketplacePage() {
  let rows: BackendCatalogModel[] = [];

  try {
    const response = await fetch(`${backendUrl}/api/models`, { cache: 'no-store' });
    rows = response.ok ? ((await response.json()) as BackendCatalogModel[]) : [];
  } catch {
    rows = [];
  }

  const models: CatalogModel[] = rows.map((model) => {
    const priceMin = model.priceRangeMin ?? model.priceMin ?? 0;
    const priceMax = model.priceRangeMax ?? model.priceMax ?? priceMin;
    const category = (model.category ?? '').trim();

    return {
      id: model.id,
      name: model.name?.trim() || 'Adsiz urun',
      description: (model.description ?? '').trim() || 'Satici bu model icin henuz aciklama eklememis.',
      category,
      categoryLabel: categoryLabels[category] ?? category,
      modelUrl: model.modelUrl ?? model.viewerDataKey ?? '',
      imageUrls: model.imageUrls ?? [],
      price: priceMin,
      priceRangeMin: priceMin,
      priceRangeMax: priceMax,
      seller: { id: model.seller?.id ?? model.user?.id ?? '', name: model.seller?.name ?? model.user?.name ?? 'Satici' },
    };
  });

  return <MarketplaceCatalog models={models} />;
}
