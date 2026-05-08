import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1200).optional().default(''),
  category: z.string().trim().min(1).max(80),
  price: z.coerce.number().int().positive().optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  fileUrl: z.string().trim().url(),
});

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
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
    let priceMin = body.priceMin ?? body.price ?? 0;
    let priceMax = body.priceMax ?? body.price ?? priceMin;

    if (priceMax < priceMin) {
      [priceMin, priceMax] = [priceMax, priceMin];
    }

    const product = await prisma.model.create({
      data: {
        userId: req.user!.id,
        type: 'CATALOG',
        status: 'ACTIVE',
        name: body.name,
        description: body.description || null,
        category: body.category,
        priceRangeMin: priceMin,
        priceRangeMax: priceMax,
        viewerDataKey: body.fileUrl,
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

export default router;
