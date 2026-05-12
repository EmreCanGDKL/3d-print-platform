import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const uploadsDir = path.resolve(__dirname, '../../uploads');

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1200).optional().default(''),
  category: z.string().trim().min(1).max(80),
  price: z.coerce.number().int().positive(),
  imageUrls: z.array(z.string().trim().url()).min(1).max(5),
});

function getCatalogImages(model: { sourceImage: string | null; viewerDataKey: string }) {
  if (model.sourceImage) {
    try {
      const parsed = JSON.parse(model.sourceImage);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      return [model.sourceImage];
    }
  }

  return model.viewerDataKey ? [model.viewerDataKey] : [];
}

router.get('/', async (req, res) => {
  try {
    const { category = 'all' } = req.query;

    const where: any = {
      type: 'CATALOG',
      status: 'ACTIVE',
    };

    if (category && category !== 'all') {
      where.category = category as string;
    }

    const models = await prisma.model.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      category: model.category,
      priceRangeMin: model.priceRangeMin,
      priceRangeMax: model.priceRangeMax,
      modelUrl: model.viewerDataKey,
      imageUrls: getCatalogImages(model),
      seller: {
        id: model.user.id,
        name: model.user.name,
        rating: 4.8,
      },
      stats: {
        vertexCount: model.vertexCount,
        volume: model.volume,
        surfaceArea: model.surfaceArea,
      },
      createdAt: model.createdAt,
    }));

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Modeller alınamadı' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'SELLER') {
      return res.status(403).json({ error: 'Ürün eklemek için satıcı hesabı gerekli.' });
    }

    const body = productSchema.parse(req.body);
    const price = body.price;
    const imageUrls = body.imageUrls;

    const product = await prisma.model.create({
      data: {
        userId: req.user!.id,
        type: 'CATALOG',
        status: 'ACTIVE',
        name: body.name,
        description: body.description || null,
        category: body.category,
        priceRangeMin: price,
        priceRangeMax: price,
        viewerDataKey: imageUrls[0],
        sourceImage: JSON.stringify(imageUrls),
        originalStorageKey: null,
      },
    });

    res.status(201).json({ success: true, product });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ürün bilgileri eksik veya geçersiz.' });
    }
    res.status(500).json({ error: 'Ürün kaydedilemedi' });
  }
});

router.delete('/:modelId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: { id: true, userId: true, type: true },
    });

    if (!model || model.type !== 'CATALOG') {
      return res.status(404).json({ error: 'Urun bulunamadi' });
    }

    if (model.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu urunu silme yetkiniz yok' });
    }

    await prisma.model.update({
      where: { id: modelId },
      data: { status: 'INACTIVE' },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Urun silinemedi' });
  }
});

router.get('/secure-view/:modelId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;
    const userId = req.user!.id;

    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return res.status(404).json({ error: 'Model bulunamadı' });
    }

    let hasAccess = model.userId === userId;
    if (!hasAccess) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          modelId,
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      });
      hasAccess = !!conversation;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Erişim reddedildi' });
    }

    const viewerPath = path.join(__dirname, '../../uploads', model.viewerDataKey);

    if (!fs.existsSync(viewerPath)) {
      return res.status(404).json({ error: 'Model verisi bulunamadı' });
    }

    const secureData = JSON.parse(fs.readFileSync(viewerPath, 'utf-8'));

    if (secureData.type !== 'SecureGeometry') {
      return res.status(500).json({ error: 'Geçersiz model formatı' });
    }

    res.json(secureData);
  } catch (error: any) {
    res.status(500).json({ error: 'Model yüklenemedi' });
  }
});

router.get('/file/:modelId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;
    const userId = req.user!.id;

    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return res.status(404).json({ error: 'Model bulunamadı' });
    }

    let hasAccess = model.userId === userId;
    if (!hasAccess) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          modelId,
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      });
      hasAccess = !!conversation;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Erişim reddedildi' });
    }

    const storageKey = model.originalStorageKey || model.viewerDataKey;

    if (/^https?:\/\//i.test(storageKey)) {
      return res.redirect(storageKey);
    }

    const filePath = path.resolve(uploadsDir, storageKey);

    if (!filePath.startsWith(uploadsDir + path.sep) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Model dosyası bulunamadı' });
    }

    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.glb') {
      res.type('model/gltf-binary');
    } else if (extension === '.gltf') {
      res.type('model/gltf+json');
    } else {
      res.type('application/octet-stream');
    }

    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ error: 'Model dosyası yüklenemedi' });
  }
});

export default router;
