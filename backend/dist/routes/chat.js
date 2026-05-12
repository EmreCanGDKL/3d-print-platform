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
const orderSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(1),
});
const orderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ORDERED', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
});
const statusLabels = {
    ORDERED: 'Siparis alindi',
    PREPARING: 'Hazirlaniyor',
    SHIPPED: 'Kargoya verildi',
    COMPLETED: 'Tamamlandi',
    CANCELLED: 'Iptal edildi',
};
function getConversationPrice(conversation) {
    return conversation.model?.priceRangeMin ?? conversation.model?.priceRangeMax ?? 0;
}
async function toConversationSummary(conversation, userId) {
    const isBuyer = conversation.buyerId === userId;
    const participant = isBuyer ? conversation.seller : conversation.buyer;
    const latestMessage = conversation.messages?.[0] ?? null;
    const unreadCount = await prisma.message.count({
        where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            readAt: null,
        },
    });
    return {
        id: conversation.id,
        modelId: conversation.modelId,
        modelName: conversation.model?.name,
        modelType: conversation.modelType,
        status: conversation.status,
        statusLabel: statusLabels[conversation.status] || (conversation.status === 'ACTIVE' ? 'Mesajlasma' : conversation.status),
        price: getConversationPrice(conversation),
        participant: {
            id: participant.id,
            name: participant.name,
            role: isBuyer ? 'seller' : 'buyer',
        },
        latestMessage: latestMessage
            ? {
                content: latestMessage.content,
                senderId: latestMessage.senderId,
                createdAt: latestMessage.createdAt,
            }
            : null,
        unreadCount,
        updatedAt: conversation.updatedAt,
    };
}
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
                content: model.type === 'CATALOG'
                    ? `Bu urun hakkinda bilgi almak istiyorum: ${model.name || modelId}`
                    : `Bu model için fiyat teklifi almak istiyorum: ${model.name || modelId}`,
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
router.post('/order', auth_1.authenticateToken, async (req, res) => {
    try {
        const { modelId } = orderSchema.parse(req.body);
        const buyerId = req.user.id;
        const model = await prisma.model.findFirst({
            where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
            include: { user: true },
        });
        if (!model) {
            return res.status(404).json({ error: 'Urun bulunamadi' });
        }
        if (model.userId === buyerId) {
            return res.status(400).json({ error: 'Kendi urununuz icin siparis olusturamazsiniz.' });
        }
        const price = model.priceRangeMin ?? model.priceRangeMax ?? 0;
        const existingConvo = await prisma.conversation.findFirst({
            where: {
                buyerId,
                sellerId: model.userId,
                modelId,
            },
        });
        const conversation = existingConvo
            ? await prisma.conversation.update({
                where: { id: existingConvo.id },
                data: {
                    status: 'ORDERED',
                    updatedAt: new Date(),
                },
            })
            : await prisma.conversation.create({
                data: {
                    buyerId,
                    sellerId: model.userId,
                    modelId,
                    modelType: 'CATALOG',
                    status: 'ORDERED',
                },
            });
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: buyerId,
                content: `Siparis olusturuldu: ${model.name || modelId} - TL ${price.toLocaleString('tr-TR')}`,
                isQuote: false,
            },
        });
        res.status(201).json({ success: true, conversationId: conversation.id });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Siparis icin gecerli urun bilgisi gerekli.' });
        }
        res.status(500).json({ error: 'Siparis olusturulamadi' });
    }
});
router.get('/inbox/list', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [{ buyerId: userId }, { sellerId: userId }],
            },
            include: {
                model: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        priceRangeMin: true,
                        priceRangeMax: true,
                        viewerDataKey: true,
                    },
                },
                buyer: { select: { id: true, name: true } },
                seller: { select: { id: true, name: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        content: true,
                        senderId: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        const items = await Promise.all(conversations.map((conversation) => toConversationSummary(conversation, userId)));
        res.json({ items });
    }
    catch (error) {
        res.status(500).json({ error: 'Siparisler alinamadi' });
    }
});
router.get('/notifications/summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [{ buyerId: userId }, { sellerId: userId }],
            },
            select: {
                id: true,
                sellerId: true,
                status: true,
            },
        });
        const conversationIds = conversations.map((conversation) => conversation.id);
        const unreadCount = conversationIds.length === 0
            ? 0
            : await prisma.message.count({
                where: {
                    conversationId: { in: conversationIds },
                    senderId: { not: userId },
                    readAt: null,
                },
            });
        const sellerOrderCount = conversations.filter((conversation) => conversation.sellerId === userId && conversation.status === 'ORDERED').length;
        res.json({ unreadCount, sellerOrderCount, total: Math.max(unreadCount, sellerOrderCount) });
    }
    catch (error) {
        res.status(500).json({ error: 'Bildirimler alinamadi' });
    }
});
router.patch('/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = orderStatusSchema.parse(req.body);
        const userId = req.user.id;
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                OR: [{ buyerId: userId }, { sellerId: userId }],
            },
            include: { model: true },
        });
        if (!conversation) {
            return res.status(404).json({ error: 'Siparis bulunamadi' });
        }
        const isSeller = conversation.sellerId === userId;
        const canChangeStatus = isSeller || status === 'CANCELLED';
        if (!canChangeStatus) {
            return res.status(403).json({ error: 'Siparis durumunu guncelleme yetkiniz yok' });
        }
        const updated = await prisma.conversation.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
        await prisma.message.create({
            data: {
                conversationId: id,
                senderId: userId,
                content: `Siparis durumu guncellendi: ${statusLabels[status]}`,
                isQuote: false,
            },
        });
        res.json({ success: true, status: updated.status, statusLabel: statusLabels[updated.status] });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Gecersiz siparis durumu.' });
        }
        res.status(500).json({ error: 'Siparis durumu guncellenemedi' });
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
        await prisma.message.updateMany({
            where: {
                conversationId: conversation.id,
                senderId: { not: userId },
                readAt: null,
            },
            data: { readAt: new Date() },
        });
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
            status: conversation.status,
            statusLabel: statusLabels[conversation.status] || conversation.status,
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
