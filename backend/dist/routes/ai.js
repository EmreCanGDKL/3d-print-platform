"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const aiService_1 = require("../services/aiService");
const modelProcessor_1 = require("../services/modelProcessor");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const generateSchema = zod_1.z.object({
    type: zod_1.z.enum(['text', 'image']),
    prompt: zod_1.z.string().trim().optional(),
    imageUrl: zod_1.z.string().trim().max(2000).optional(),
});
const upload = (0, multer_1.default)({
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Sadece görsel dosyaları kabul edilir'));
        }
    },
});
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
function bufferIsGLB(buf) {
    return buf.length >= 12 && buf.readUInt32LE(0) === 0x46546c67;
}
function getFrontendBaseUrl() {
    const firstAllowedFrontend = process.env.FRONTEND_URLS?.split(',')[0]?.trim();
    return process.env.FRONTEND_URL?.trim() || firstAllowedFrontend || 'http://localhost:3000';
}
function resolveImageUrl(value) {
    if (!value)
        return null;
    if (value.startsWith('/')) {
        return new URL(value, getFrontendBaseUrl()).toString();
    }
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Gecerli bir gorsel baglantisi gerekli.');
    }
    return url.toString();
}
async function fetchReferenceImage(imageUrl) {
    const response = await axios_1.default.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 8 * 1024 * 1024,
        headers: {
            Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*',
            'User-Agent': 'PrintForge/1.0',
        },
    });
    const contentType = String(response.headers['content-type'] || 'image/jpeg').split(';')[0].trim();
    if (!contentType.startsWith('image/')) {
        throw new Error('Baglanti bir gorsel dondurmedi.');
    }
    const pathname = new URL(imageUrl).pathname;
    const rawFilename = decodeURIComponent(path_1.default.basename(pathname) || 'reference-image');
    const fallbackExt = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = /\.[a-z0-9]{2,5}$/i.test(rawFilename) ? rawFilename : `${rawFilename}.${fallbackExt}`;
    return {
        buffer: Buffer.from(response.data),
        mimetype: contentType,
        filename,
    };
}
router.post('/generate', auth_1.authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { type, prompt, imageUrl } = generateSchema.parse(req.body);
        const userId = req.user.id;
        let result;
        if (type === 'text') {
            if (!prompt) {
                return res.status(400).json({ error: 'Prompt gerekli' });
            }
            result = await aiService_1.aiService.generateFromText(prompt);
        }
        else {
            const resolvedImageUrl = resolveImageUrl(imageUrl);
            if (!req.file && !resolvedImageUrl) {
                return res.status(400).json({ error: 'Görsel gerekli' });
            }
            const reference = req.file
                ? { buffer: req.file.buffer, mimetype: req.file.mimetype, filename: req.file.originalname }
                : await fetchReferenceImage(resolvedImageUrl);
            result = await aiService_1.aiService.generateFromImage(reference.buffer, reference.mimetype, reference.filename);
        }
        const model = await prisma.model.create({
            data: {
                userId,
                type: 'AI',
                status: 'PENDING',
                prompt: prompt || null,
                viewerDataKey: result.taskId,
                generationType: type,
            },
        });
        res.json({
            modelId: model.id,
            taskId: result.taskId,
            status: 'pending',
        });
    }
    catch (error) {
        console.error('AI generation error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Üretim tipi veya girdi geçersiz.' });
        }
        res.status(500).json({
            error: error.message || 'Model oluşturma başarısız oldu',
        });
    }
});
router.get('/status/:taskId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;
        const model = await prisma.model.findFirst({
            where: {
                userId,
                OR: [{ viewerDataKey: taskId }, { taskId }],
            },
        });
        if (!model) {
            return res.status(404).json({ error: 'Model bulunamadı' });
        }
        if (model.status === 'COMPLETED') {
            return res.json({
                modelId: model.id,
                status: 'completed',
                progress: 100,
                message: 'Tamamlandı',
            });
        }
        const status = await aiService_1.aiService.checkTaskStatus(taskId);
        if (status.status === 'success' && status.output?.model) {
            try {
                const modelResponse = await axios_1.default.get(status.output.model, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                });
                const modelBuffer = Buffer.from(modelResponse.data);
                const ext = bufferIsGLB(modelBuffer) ? 'glb' : 'stl';
                const originalKey = `originals/${userId}/${model.id}.${ext}`;
                const originalPath = path_1.default.join(uploadsDir, originalKey);
                fs_1.default.mkdirSync(path_1.default.dirname(originalPath), { recursive: true });
                fs_1.default.writeFileSync(originalPath, modelBuffer);
                if (bufferIsGLB(modelBuffer)) {
                    await prisma.model.update({
                        where: { id: model.id },
                        data: {
                            status: 'COMPLETED',
                            originalStorageKey: originalKey,
                            viewerDataKey: originalKey,
                            vertexCount: null,
                            volume: null,
                            surfaceArea: null,
                            taskId,
                            generationType: model.generationType,
                        },
                    });
                }
                else {
                    const secureData = await (0, modelProcessor_1.processModelForSecureViewing)(modelBuffer);
                    const viewerKey = `viewers/${userId}/${model.id}.json`;
                    const viewerPath = path_1.default.join(uploadsDir, viewerKey);
                    fs_1.default.mkdirSync(path_1.default.dirname(viewerPath), { recursive: true });
                    fs_1.default.writeFileSync(viewerPath, JSON.stringify(secureData));
                    await prisma.model.update({
                        where: { id: model.id },
                        data: {
                            status: 'COMPLETED',
                            originalStorageKey: originalKey,
                            viewerDataKey: viewerKey,
                            vertexCount: secureData.metadata.vertexCount,
                            volume: secureData.metadata.volume,
                            surfaceArea: secureData.metadata.surfaceArea,
                            taskId,
                            generationType: model.generationType,
                        },
                    });
                }
                return res.json({
                    modelId: model.id,
                    status: 'completed',
                    progress: 100,
                    message: 'Tamamlandı',
                });
            }
            catch (processError) {
                console.error('Model processing error:', processError);
                await prisma.model.update({
                    where: { id: model.id },
                    data: { status: 'FAILED' },
                });
                return res.json({
                    modelId: model.id,
                    status: 'failed',
                    message: 'İşleme hatası',
                });
            }
        }
        if (status.status === 'running' || status.status === 'queued') {
            await prisma.model.update({
                where: { id: model.id },
                data: { status: 'PROCESSING' },
            });
        }
        res.json({
            modelId: model.id,
            status: status.status,
            progress: status.progress,
            message: status.message,
        });
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: error.message || 'Durum kontrolü başarısız',
        });
    }
});
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const models = await prisma.model.findMany({
            where: {
                userId,
                type: 'AI',
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                prompt: true,
                generationType: true,
                createdAt: true,
            },
        });
        res.json(models);
    }
    catch (error) {
        res.status(500).json({ error: 'Geçmiş alınamadı' });
    }
});
exports.default = router;
