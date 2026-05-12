"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const createConversationSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(1),
    type: zod_1.z.enum(['AI', 'CATALOG', 'ai', 'catalog']).default('CATALOG'),
    sellerId: zod_1.z.string().optional(),
});
const messageSchema = zod_1.z.object({
    content: zod_1.z.string().trim().min(1).max(2000),
    isQuote: zod_1.z.boolean().optional(),
    quoteAmount: zod_1.z.coerce.number().positive().optional(),
});
router.post('/new', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId, type, sellerId } = createConversationSchema.parse(req.body);
        const buyerId = req.user.id;
        const model = await prisma.model.findUnique({
            where: { id: modelId },
            include: { user: true },
        });
        if (!model) {
            return res.status(404).json({ error: 'Model bulunamadı' });
        }
        const finalSellerId = sellerId || model.userId;
        const existingConvo = await prisma.conversation.findFirst({
            where: {
                buyerId,
                modelId,
                sellerId: finalSellerId,
            },
        });
        if (existingConvo) {
            return res.json({ conversationId: existingConvo.id });
        }
        const conversation = await prisma.conversation.create({
            data: {
                buyerId,
                sellerId: finalSellerId,
                modelId,
                modelType: type.toUpperCase() === 'AI' ? 'AI' : 'CATALOG',
                status: 'ACTIVE',
            },
        });
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: buyerId,
                content: `Bu model için fiyat teklifi almak istiyorum: ${model.name || modelId}`,
                isQuote: false,
            },
        });
        res.json({ conversationId: conversation.id });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Sohbet başlatmak için geçerli model bilgisi gerekli.' });
        }
        res.status(500).json({ error: 'Sohbet oluşturulamadı' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                OR: [{ buyerId: userId }, { sellerId: userId }],
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                            },
                        },
                    },
                },
                model: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        viewerDataKey: true,
                        priceRangeMin: true,
                        priceRangeMax: true,
                        category: true,
                    },
                },
                buyer: {
                    select: { id: true, name: true },
                },
                seller: {
                    select: { id: true, name: true },
                },
            },
        });
        if (!conversation) {
            return res.status(404).json({ error: 'Sohbet bulunamadı' });
        }
        const isBuyer = conversation.buyerId === userId;
        const participant = isBuyer ? conversation.seller : conversation.buyer;
        const messages = conversation.messages.map((msg) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.sender.name,
            senderRole: msg.senderId === conversation.buyerId ? 'user' : 'seller',
            content: msg.content,
            timestamp: msg.createdAt,
            isQuote: msg.isQuote,
            quoteAmount: msg.quoteAmount,
            quoteCurrency: msg.quoteCurrency,
        }));
        res.json({
            id: conversation.id,
            modelId: conversation.modelId,
            modelName: conversation.model.name,
            modelType: conversation.modelType,
            model: conversation.model,
            participant: {
                id: participant.id,
                name: participant.name,
                role: isBuyer ? 'seller' : 'buyer',
            },
            messages,
            updatedAt: conversation.updatedAt,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Sohbet alınamadı' });
    }
});
router.post('/:id/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, isQuote, quoteAmount } = messageSchema.parse(req.body);
        const senderId = req.user.id;
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                OR: [{ buyerId: senderId }, { sellerId: senderId }],
            },
        });
        if (!conversation) {
            return res.status(403).json({ error: 'Bu sohbete erişim yok' });
        }
        const message = await prisma.message.create({
            data: {
                conversationId: id,
                senderId,
                content,
                isQuote: isQuote || false,
                quoteAmount: quoteAmount || null,
            },
            include: {
                sender: {
                    select: { id: true, name: true, role: true },
                },
            },
        });
        await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
        res.json({
            id: message.id,
            senderId: message.senderId,
            senderName: message.sender.name,
            senderRole: message.senderId === conversation.buyerId ? 'user' : 'seller',
            content: message.content,
            timestamp: message.createdAt,
            isQuote: message.isQuote,
            quoteAmount: message.quoteAmount,
            quoteCurrency: message.quoteCurrency,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Mesaj içeriği geçerli değil.' });
        }
        res.status(500).json({ error: 'Mesaj gönderilemedi' });
    }
});
exports.default = router;
