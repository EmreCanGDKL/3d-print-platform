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
router.post('/generate', auth_1.authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { type, prompt } = generateSchema.parse(req.body);
        const userId = req.user.id;
        let result;
        if (type === 'text') {
            if (!prompt) {
                return res.status(400).json({ error: 'Prompt gerekli' });
            }
            result = await aiService_1.aiService.generateFromText(prompt);
        }
        else {
            if (!req.file) {
                return res.status(400).json({ error: 'Görsel gerekli' });
            }
            result = await aiService_1.aiService.generateFromImage(req.file.buffer, req.file.mimetype, req.file.originalname);
        }
        const model = await prisma.model.create({
            data: {
                userId,
                type: 'AI',
                status: 'PENDING',
                prompt: type === 'text' ? prompt : null,
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
