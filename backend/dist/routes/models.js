"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
const productSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    description: zod_1.z.string().trim().max(1200).optional().default(''),
    category: zod_1.z.string().trim().min(1).max(80),
    price: zod_1.z.coerce.number().int().positive(),
    imageUrls: zod_1.z.array(zod_1.z.string().trim().url()).min(1).max(5),
});
const reviewSchema = zod_1.z.object({
    rating: zod_1.z.coerce.number().int().min(1).max(5),
    comment: zod_1.z.string().trim().min(3).max(1000),
});
const questionSchema = zod_1.z.object({
    question: zod_1.z.string().trim().min(5).max(800),
});
const answerSchema = zod_1.z.object({
    answer: zod_1.z.string().trim().min(2).max(1000),
});
function getCatalogImages(model) {
    if (model.sourceImage) {
        try {
            const parsed = JSON.parse(model.sourceImage);
            if (Array.isArray(parsed)) {
                return parsed.filter((item) => typeof item === 'string' && item.length > 0);
            }
        }
        catch {
            return [model.sourceImage];
        }
    }
    return model.viewerDataKey ? [model.viewerDataKey] : [];
}
async function getReviewSummary(modelId) {
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
        const where = {
            type: 'CATALOG',
            status: 'ACTIVE',
        };
        if (category && category !== 'all') {
            where.category = category;
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
        const response = await Promise.all(models.map(async (model) => {
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
                    name: model.user.name,
                    rating: 4.8,
                },
                stats: {
                    vertexCount: model.vertexCount,
                    volume: model.volume,
                    surfaceArea: model.surfaceArea,
                },
                createdAt: model.createdAt,
            };
        }));
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: 'Modeller alınamadı' });
    }
});
router.get('/:modelId/details', async (req, res) => {
    try {
        const { modelId } = req.params;
        const model = await prisma.model.findFirst({
            where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
            include: {
                user: { select: { id: true, name: true } },
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
            return res.status(404).json({ error: 'Urun bulunamadi' });
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
            seller: model.user,
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
    }
    catch (error) {
        res.status(500).json({ error: 'Urun detayi alinamadi' });
    }
});
router.post('/:modelId/reviews', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId } = req.params;
        const body = reviewSchema.parse(req.body);
        const model = await prisma.model.findFirst({
            where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
            select: { id: true },
        });
        if (!model) {
            return res.status(404).json({ error: 'Urun bulunamadi' });
        }
        const review = await prisma.productReview.upsert({
            where: { modelId_userId: { modelId, userId: req.user.id } },
            update: { rating: body.rating, comment: body.comment },
            create: {
                modelId,
                userId: req.user.id,
                rating: body.rating,
                comment: body.comment,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        res.status(201).json({ success: true, review });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Yorum ve puan bilgisi gecersiz.' });
        }
        res.status(500).json({ error: 'Yorum kaydedilemedi' });
    }
});
router.post('/:modelId/questions', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId } = req.params;
        const body = questionSchema.parse(req.body);
        const model = await prisma.model.findFirst({
            where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
            select: { id: true },
        });
        if (!model) {
            return res.status(404).json({ error: 'Urun bulunamadi' });
        }
        const question = await prisma.productQuestion.create({
            data: {
                modelId,
                userId: req.user.id,
                question: body.question,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        res.status(201).json({ success: true, question });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Soru metni gecersiz.' });
        }
        res.status(500).json({ error: 'Soru kaydedilemedi' });
    }
});
router.post('/:modelId/questions/:questionId/answer', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId, questionId } = req.params;
        const body = answerSchema.parse(req.body);
        const model = await prisma.model.findFirst({
            where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
            select: { id: true, userId: true },
        });
        if (!model) {
            return res.status(404).json({ error: 'Urun bulunamadi' });
        }
        if (model.userId !== req.user.id) {
            return res.status(403).json({ error: 'Bu soruyu sadece urunun saticisi yanitlayabilir.' });
        }
        const existingQuestion = await prisma.productQuestion.findFirst({
            where: { id: questionId, modelId },
            select: { id: true },
        });
        if (!existingQuestion) {
            return res.status(404).json({ error: 'Soru bulunamadi' });
        }
        const question = await prisma.productQuestion.update({
            where: { id: existingQuestion.id },
            data: {
                answer: body.answer,
                answerUserId: req.user.id,
                answeredAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true } },
                answerUser: { select: { id: true, name: true } },
            },
        });
        res.json({ success: true, question });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Cevap metni gecersiz.' });
        }
        res.status(500).json({ error: 'Cevap kaydedilemedi' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'SELLER') {
            return res.status(403).json({ error: 'Ürün eklemek için satıcı hesabı gerekli.' });
        }
        const body = productSchema.parse(req.body);
        const price = body.price;
        const imageUrls = body.imageUrls;
        const product = await prisma.model.create({
            data: {
                userId: req.user.id,
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Ürün bilgileri eksik veya geçersiz.' });
        }
        res.status(500).json({ error: 'Ürün kaydedilemedi' });
    }
});
router.delete('/:modelId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId } = req.params;
        const model = await prisma.model.findUnique({
            where: { id: modelId },
            select: { id: true, userId: true, type: true },
        });
        if (!model || model.type !== 'CATALOG') {
            return res.status(404).json({ error: 'Urun bulunamadi' });
        }
        if (model.userId !== req.user.id) {
            return res.status(403).json({ error: 'Bu urunu silme yetkiniz yok' });
        }
        await prisma.model.update({
            where: { id: modelId },
            data: { status: 'INACTIVE' },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Urun silinemedi' });
    }
});
router.get('/secure-view/:modelId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId } = req.params;
        const userId = req.user.id;
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
        const viewerPath = path_1.default.join(__dirname, '../../uploads', model.viewerDataKey);
        if (!fs_1.default.existsSync(viewerPath)) {
            return res.status(404).json({ error: 'Model verisi bulunamadı' });
        }
        const secureData = JSON.parse(fs_1.default.readFileSync(viewerPath, 'utf-8'));
        if (secureData.type !== 'SecureGeometry') {
            return res.status(500).json({ error: 'Geçersiz model formatı' });
        }
        res.json(secureData);
    }
    catch (error) {
        res.status(500).json({ error: 'Model yüklenemedi' });
    }
});
router.get('/file/:modelId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId } = req.params;
        const userId = req.user.id;
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
        const filePath = path_1.default.resolve(uploadsDir, storageKey);
        if (!filePath.startsWith(uploadsDir + path_1.default.sep) || !fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Model dosyası bulunamadı' });
        }
        const extension = path_1.default.extname(filePath).toLowerCase();
        if (extension === '.glb') {
            res.type('model/gltf-binary');
        }
        else if (extension === '.gltf') {
            res.type('model/gltf+json');
        }
        else {
            res.type('application/octet-stream');
        }
        res.sendFile(filePath);
    }
    catch (error) {
        res.status(500).json({ error: 'Model dosyası yüklenemedi' });
    }
});
exports.default = router;
