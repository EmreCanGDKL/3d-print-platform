import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { category = 'all' } = req.query;

    const where: any = {
      type: 'CATALOG',
      status: 'ACTIVE'
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
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = models.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      category: model.category,
      priceRangeMin: model.priceRangeMin,
      priceRangeMax: model.priceRangeMax,
      seller: {
        id: model.user.id,
        name: model.user.name,
        rating: 4.5
      },
      metadata: model.metadata,
      createdAt: model.createdAt
    }));

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Modeller alınamadı' });
  }
});

router.get('/secure-view/:modelId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;
    const userId = req.user!.id;

    const model = await prisma.model.findUnique({
      where: { id: modelId }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model bulunamadı' });
    }

    let hasAccess = false;
    if (model.userId === userId) {
      hasAccess = true;
    } else {
      const conversation = await prisma.conversation.findFirst({
        where: {
          modelId,
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ]
        }
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