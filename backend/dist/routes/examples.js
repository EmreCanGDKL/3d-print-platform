"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../utils/admin");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const exampleItems = prisma.exampleItem;
const imageUrlSchema = zod_1.z.string().trim().min(1).refine((value) => {
    if (value.startsWith('/'))
        return true;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}, 'Geçerli bir görsel bağlantısı girin.');
const exampleSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2).max(140),
    category: zod_1.z.string().trim().min(2).max(80),
    imageUrl: imageUrlSchema,
    prompt: zod_1.z.string().trim().min(8).max(1500),
    tags: zod_1.z.array(zod_1.z.string().trim().min(1).max(32)).max(8).optional().default([]),
});
const exampleUpdateSchema = exampleSchema.partial();
function requireAdmin(req, res) {
    if (!req.user || !(0, admin_1.isAdminUser)(req.user)) {
        res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli.' });
        return false;
    }
    return true;
}
function parseTags(tags) {
    try {
        const parsed = JSON.parse(tags || '[]');
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    }
    catch {
        return [];
    }
}
function toExample(item) {
    return {
        id: item.id,
        title: item.title,
        category: item.category,
        imageUrl: item.imageUrl,
        prompt: item.prompt,
        tags: parseTags(item.tags),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
async function listExamples() {
    return exampleItems.findMany({ orderBy: { createdAt: 'desc' } });
}
router.get('/', async (_req, res) => {
    try {
        const items = await listExamples();
        res.json({ items: items.map(toExample) });
    }
    catch (error) {
        res.status(500).json({ error: 'Örnekler alınamadı.' });
    }
});
router.get('/proxy-image', async (req, res) => {
    try {
        const imageUrl = imageUrlSchema.parse(String(req.query.url || ''));
        if (imageUrl.startsWith('/')) {
            return res.status(400).json({ error: 'Lokal görseller için proxy gerekmez.' });
        }
        const response = await axios_1.default.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
            maxContentLength: 8 * 1024 * 1024,
            headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*' },
        });
        const contentType = String(response.headers['content-type'] || 'image/jpeg');
        if (!contentType.startsWith('image/')) {
            return res.status(400).json({ error: 'Bağlantı bir görsel döndürmedi.' });
        }
        res.type(contentType);
        res.send(Buffer.from(response.data));
    }
    catch (error) {
        res.status(400).json({ error: 'Görsel alınamadı.' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!requireAdmin(req, res))
            return;
        const body = exampleSchema.parse(req.body);
        const item = await exampleItems.create({
            data: {
                title: body.title,
                category: body.category,
                imageUrl: body.imageUrl,
                prompt: body.prompt,
                tags: JSON.stringify(body.tags),
            },
        });
        res.status(201).json({ item: toExample(item) });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Örnek bilgileri eksik veya geçersiz.' });
        }
        res.status(500).json({ error: 'Örnek kaydedilemedi.' });
    }
});
router.patch('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!requireAdmin(req, res))
            return;
        const body = exampleUpdateSchema.parse(req.body);
        const current = await exampleItems.findUnique({ where: { id: req.params.id } });
        if (!current)
            return res.status(404).json({ error: 'Örnek bulunamadı.' });
        const item = await exampleItems.update({
            where: { id: req.params.id },
            data: {
                title: body.title ?? undefined,
                category: body.category ?? undefined,
                imageUrl: body.imageUrl ?? undefined,
                prompt: body.prompt ?? undefined,
                tags: body.tags ? JSON.stringify(body.tags) : undefined,
            },
        });
        res.json({ item: toExample(item) });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Örnek bilgileri eksik veya geçersiz.' });
        }
        res.status(500).json({ error: 'Örnek güncellenemedi.' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!requireAdmin(req, res))
            return;
        await exampleItems.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Örnek silinemedi.' });
    }
});
exports.default = router;
