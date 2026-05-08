import prisma from '@/lib/prisma';
import MarketplaceCatalog, { type CatalogModel } from './MarketplaceCatalog';

export const dynamic = 'force-dynamic';

const categoryLabels: Record<string, string> = {
  art: 'Sanat ve dekor',
  functional: 'Fonksiyonel parca',
  figurine: 'Figur',
  mechanical: 'Mekanik parca',
  jewelry: 'Aksesuar',
};

export default async function MarketplacePage() {
  const rows = await prisma.model.findMany({
    where: { type: 'CATALOG', status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const models: CatalogModel[] = rows.map((model) => {
    const priceMin = model.priceRangeMin ?? 0;
    const priceMax = model.priceRangeMax ?? priceMin;
    const category = (model.category ?? '').trim();

    return {
      id: model.id,
      name: model.name?.trim() || 'Adsiz urun',
      description: (model.description ?? '').trim() || 'Satici bu model icin henuz aciklama eklememis.',
      category,
      categoryLabel: categoryLabels[category] ?? category,
      modelUrl: model.viewerDataKey,
      priceRangeMin: priceMin,
      priceRangeMax: priceMax,
      seller: { id: model.user.id, name: model.user.name },
    };
  });

  return <MarketplaceCatalog models={models} />;
}
