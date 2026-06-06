import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const uploadsDir = path.resolve(__dirname, '../../uploads');
const productUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1200).optional().default(''),
  category: z.string().trim().min(1).max(80),
  price: z.coerce.number().int().positive(),
  imageUrls: z.array(z.string().trim().url()).min(1).max(5),
});

const productUpdateSchema = productSchema.partial().extend({
  imageUrls: z.array(z.string().trim().url()).min(1).max(5).optional(),
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000),
});

const questionSchema = z.object({
  question: z.string().trim().min(5).max(800),
});

const answerSchema = z.object({
  answer: z.string().trim().min(2).max(1000),
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

function getSellerDisplayName(user: { name: string; companyName?: string | null }) {
  return user.companyName || user.name;
}

function getPublicBackendUrl(req: any) {
  const configured = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function toCatalogProduct(model: any) {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    category: model.category,
    price: model.priceRangeMin ?? 0,
    priceRangeMin: model.priceRangeMin,
    priceRangeMax: model.priceRangeMax,
    imageUrls: getCatalogImages(model),
    status: model.status,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

async function getReviewSummary(modelId: string) {
  const aggregate = await prisma.productReview.aggregate({
    where: { modelId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    average: Number((aggregate._avg.rating || 0).toFixed(1)),
    count: aggregate._count.rating,
  };
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
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = await Promise.all(
      models.map(async (model) => {
        const reviewSummary = await getReviewSummary(model.id);

        return {
          id: model.id,
          name: model.name,
          description: model.description,
          category: model.category,
          priceRangeMin: model.priceRangeMin,
          priceRangeMax: model.priceRangeMax,
          modelUrl: model.viewerDataKey,
          imageUrls: getCatalogImages(model),
          ratingAverage: reviewSummary.average,
          ratingCount: reviewSummary.count,
          seller: {
            id: model.user.id,
            name: getSellerDisplayName(model.user),
            rating: 4.8,
          },
          stats: {
            vertexCount: model.vertexCount,
            volume: model.volume,
            surfaceArea: model.surfaceArea,
          },
          createdAt: model.createdAt,
        };
      }),
    );

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Modeller alınamadı' });
  }
});

router.get('/mine', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'SELLER') {
      return res.status(403).json({ error: 'Ürünleri görüntülemek için satıcı hesabı gerekli.' });
    }

    const products = await prisma.model.findMany({
      where: {
        userId: req.user!.id,
        type: 'CATALOG',
        status: { not: 'INACTIVE' },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ items: products.map(toCatalogProduct) });
  } catch (error: any) {
    res.status(500).json({ error: 'Ürünler alınamadı' });
  }
});

router.get('/:modelId/details', async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = await prisma.model.findFirst({
      where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, companyName: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        questions: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            answerUser: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!model) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const reviewSummary = await getReviewSummary(model.id);

    res.json({
      id: model.id,
      name: model.name,
      description: model.description,
      category: model.category,
      price: model.priceRangeMin ?? 0,
      imageUrls: getCatalogImages(model),
      ratingAverage: reviewSummary.average,
      ratingCount: reviewSummary.count,
      seller: { id: model.user.id, name: getSellerDisplayName(model.user) },
      reviews: model.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.user,
      })),
      questions: model.questions.map((question) => ({
        id: question.id,
        question: question.question,
        answer: question.answer,
        answeredAt: question.answeredAt,
        createdAt: question.createdAt,
        user: question.user,
        answerUser: question.answerUser,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Ürün detayı alınamadı' });
  }
});

router.post('/:modelId/reviews', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;
    const body = reviewSchema.parse(req.body);

    const model = await prisma.model.findFirst({
      where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
      select: { id: true },
    });

    if (!model) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const review = await prisma.productReview.upsert({
      where: { modelId_userId: { modelId, userId: req.user!.id } },
      update: { rating: body.rating, comment: body.comment },
      create: {
        modelId,
        userId: req.user!.id,
        rating: body.rating,
        comment: body.comment,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, review });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Yorum ve puan bilgisi geçersiz.' });
    }
    res.status(500).json({ error: 'Yorum kaydedilemedi' });
  }
});

router.post('/:modelId/questions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;
    const body = questionSchema.parse(req.body);

    const model = await prisma.model.findFirst({
      where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
      select: { id: true },
    });

    if (!model) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const question = await prisma.productQuestion.create({
      data: {
        modelId,
        userId: req.user!.id,
        question: body.question,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, question });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Soru metni geçersiz.' });
    }
    res.status(500).json({ error: 'Soru kaydedilemedi' });
  }
});

router.post('/:modelId/questions/:questionId/answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId, questionId } = req.params;
    const body = answerSchema.parse(req.body);

    const model = await prisma.model.findFirst({
      where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
      select: { id: true, userId: true },
    });

    if (!model) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    if (model.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu soruyu sadece ürünün satıcısı yanıtlayabilir.' });
    }

    const existingQuestion = await prisma.productQuestion.findFirst({
      where: { id: questionId, modelId },
      select: { id: true },
    });

    if (!existingQuestion) {
      return res.status(404).json({ error: 'Soru bulunamadı' });
    }

    const question = await prisma.productQuestion.update({
      where: { id: existingQuestion.id },
      data: {
        answer: body.answer,
        answerUserId: req.user!.id,
        answeredAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        answerUser: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, question });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Cevap metni geçersiz.' });
    }
    res.status(500).json({ error: 'Cevap kaydedilemedi' });
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

router.patch('/:modelId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'SELLER') {
      return res.status(403).json({ error: 'Ürün düzenlemek için satıcı hesabı gerekli.' });
    }

    const { modelId } = req.params;
    const body = productUpdateSchema.parse(req.body);
    const model = await prisma.model.findFirst({
      where: { id: modelId, userId: req.user!.id, type: 'CATALOG', status: { not: 'INACTIVE' } },
    });

    if (!model) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const imageUrls = body.imageUrls;
    const price = body.price;
    const product = await prisma.model.update({
      where: { id: model.id },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        category: body.category ?? undefined,
        priceRangeMin: price ?? undefined,
        priceRangeMax: price ?? undefined,
        viewerDataKey: imageUrls?.[0] ?? undefined,
        sourceImage: imageUrls ? JSON.stringify(imageUrls) : undefined,
      },
    });

    res.json({ success: true, product: toCatalogProduct(product) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ürün bilgileri eksik veya geçersiz.' });
    }
    res.status(500).json({ error: 'Ürün güncellenemedi' });
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
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    if (model.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu ürünü silme yetkiniz yok' });
    }

    await prisma.model.update({
      where: { id: modelId },
      data: { status: 'INACTIVE' },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Ürün silinemedi' });
  }
});

router.post('/upload-image', authenticateToken, productUpload.array('images', 5), async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'SELLER') {
      return res.status(403).json({ error: 'Ürün görseli yüklemek için satıcı hesabı gerekli.' });
    }

    const files = (req.files || []) as Express.Multer.File[];
    if (files.length === 0) {
      return res.status(400).json({ error: 'En az bir görsel seçin.' });
    }

    const publicBase = getPublicBackendUrl(req);
    const urls = files.map((file, index) => {
      const extension = file.mimetype.includes('png')
        ? 'png'
        : file.mimetype.includes('webp')
          ? 'webp'
          : 'jpg';
      const key = `product-images/${req.user!.id}/${Date.now()}-${index}.${extension}`;
      const filePath = path.resolve(uploadsDir, key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);
      return `${publicBase}/uploads/${key.replace(/\\/g, '/')}`;
    });

    res.status(201).json({ urls });
  } catch (error: any) {
    res.status(500).json({ error: 'Görsel yüklenemedi.' });
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
    res.setHeader('X-Model-Format', extension.replace('.', '') || 'bin');

    if (extension === '.glb') {
      res.type('model/gltf-binary');
    } else if (extension === '.gltf') {
      res.type('model/gltf+json');
    } else if (extension === '.stl') {
      res.type('model/stl');
    } else if (extension === '.json') {
      res.type('application/json');
    } else {
      res.type('application/octet-stream');
    }

    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ error: 'Model dosyası yüklenemedi' });
  }
});

export default router;
