import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { isAdminUser } from '../utils/admin';

const router = Router();
const prisma = new PrismaClient();

const createConversationSchema = z.object({
  modelId: z.string().min(1),
  type: z.enum(['AI', 'CATALOG', 'ai', 'catalog']).default('CATALOG'),
  sellerId: z.string().optional(),
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  isQuote: z.boolean().optional(),
  quoteAmount: z.coerce.number().positive().optional(),
});

const orderSchema = z.object({
  modelId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).optional().default(1),
});

const orderStatusSchema = z.object({
  status: z.enum(['ORDERED', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
});

const statusLabels: Record<string, string> = {
  ORDERED: 'Sipariş alındı',
  PREPARING: 'Hazırlanıyor',
  SHIPPED: 'Kargoya verildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
};

function getConversationPrice(conversation: any) {
  return conversation.model?.priceRangeMin ?? conversation.model?.priceRangeMax ?? 0;
}

function getUserDisplayName(user: { name: string; role?: string | null; companyName?: string | null }) {
  return user.role === 'SELLER' ? user.companyName || user.name : user.name;
}

function isAdminLikeSeller(seller: { name: string; companyName?: string | null; email: string }) {
  const searchableValues = [seller.name, seller.companyName, seller.email.split('@')[0]]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLocaleLowerCase('tr-TR'));

  return (
    isAdminUser({ email: seller.email, role: 'SELLER' }) ||
    searchableValues.some((value) => value === 'admin' || value.includes('admin'))
  );
}

async function toConversationSummary(conversation: any, userId: string) {
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
    statusLabel: statusLabels[conversation.status] || (conversation.status === 'ACTIVE' ? 'Mesajlaşma' : conversation.status),
    price: getConversationPrice(conversation),
    participant: {
      id: participant.id,
      name: getUserDisplayName(participant),
      email: participant.email,
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

function visibleConversationWhere(userId: string) {
  return {
    OR: [
      { buyerId: userId, buyerArchivedAt: null },
      { sellerId: userId, sellerArchivedAt: null },
    ],
  };
}

router.get('/sellers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const sellers = await prisma.user.findMany({
      where: {
        role: 'SELLER',
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        _count: {
          select: {
            aiModels: {
              where: {
                type: 'CATALOG',
                status: 'ACTIVE',
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const visibleSellers = sellers.filter((seller) => !isAdminLikeSeller(seller));

    res.json({
      items: visibleSellers.map((seller) => ({
        id: seller.id,
        name: seller.companyName || seller.name,
        companyName: seller.companyName || seller.name,
        activeProductCount: seller._count.aiModels,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Satıcı listesi alınamadı' });
  }
});

router.post('/new', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId, type, sellerId } = createConversationSchema.parse(req.body);
    const buyerId = req.user!.id;

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { user: true },
    });

    if (!model) {
      return res.status(404).json({ error: 'Model bulunamadı' });
    }

    if (model.type === 'AI' && req.user!.role !== 'USER') {
      return res.status(403).json({ error: 'AI modeli için satıcıya mesaj gönderme yalnızca müşteri hesapları için kullanılabilir.' });
    }

    const finalSellerId = sellerId || model.userId;
    const seller = await prisma.user.findFirst({
      where: { id: finalSellerId, role: 'SELLER' },
      select: { id: true },
    });

    if (!seller) {
      return res.status(400).json({ error: 'Mesaj göndermek için geçerli bir satıcı seçin.' });
    }

    if (finalSellerId === buyerId) {
      return res.status(400).json({ error: 'Kendi hesabınıza mesaj başlatamazsınız.' });
    }

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
        content:
          model.type === 'CATALOG'
            ? `Bu ürün hakkında bilgi almak istiyorum: ${model.name || modelId}`
            : `Bu AI modeli için fiyat teklifi almak istiyorum: ${model.name || modelId}`,
        isQuote: false,
      },
    });

    res.json({ conversationId: conversation.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Sohbet başlatmak için geçerli model bilgisi gerekli.' });
    }
    res.status(500).json({ error: 'Sohbet oluşturulamadı' });
  }
});

router.post('/order', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId, quantity } = orderSchema.parse(req.body);
    const buyerId = req.user!.id;

    const model = await prisma.model.findFirst({
      where: { id: modelId, type: 'CATALOG', status: 'ACTIVE' },
      include: { user: true },
    });

    if (!model) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    if (model.userId === buyerId) {
      return res.status(400).json({ error: 'Kendi ürününüz için sipariş oluşturamazsınız.' });
    }

    const price = model.priceRangeMin ?? model.priceRangeMax ?? 0;
    const totalPrice = price * quantity;
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
        content: `Sipariş oluşturuldu: ${model.name || modelId} - ${quantity} adet - TL ${totalPrice.toLocaleString('tr-TR')}`,
        isQuote: false,
      },
    });

    res.status(201).json({ success: true, conversationId: conversation.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Sipariş için geçerli ürün bilgisi gerekli.' });
    }
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

router.get('/inbox/list', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const conversations = await prisma.conversation.findMany({
      where: visibleConversationWhere(userId),
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
        buyer: { select: { id: true, name: true, email: true, role: true, companyName: true } },
        seller: { select: { id: true, name: true, email: true, role: true, companyName: true } },
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
  } catch (error: any) {
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

router.get('/notifications/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const conversations = await prisma.conversation.findMany({
      where: visibleConversationWhere(userId),
      select: {
        id: true,
        sellerId: true,
        status: true,
      },
    });

    const conversationIds = conversations.map((conversation) => conversation.id);
    const unreadCount =
      conversationIds.length === 0
        ? 0
        : await prisma.message.count({
            where: {
              conversationId: { in: conversationIds },
              senderId: { not: userId },
              readAt: null,
            },
          });

    const sellerOrderCount = conversations.filter(
      (conversation) => conversation.sellerId === userId && conversation.status === 'ORDERED',
    ).length;

    res.json({ unreadCount, sellerOrderCount, total: unreadCount + sellerOrderCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Bildirimler alınamadı' });
  }
});

router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = orderStatusSchema.parse(req.body);
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        ...visibleConversationWhere(userId),
      },
      include: { model: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    const isSeller = conversation.sellerId === userId;
    const canChangeStatus = isSeller || status === 'CANCELLED';
    if (!canChangeStatus) {
      return res.status(403).json({ error: 'Sipariş durumunu güncelleme yetkiniz yok' });
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
        content: `Sipariş durumu güncellendi: ${statusLabels[status]}`,
        isQuote: false,
      },
    });

    res.json({ success: true, status: updated.status, statusLabel: statusLabels[updated.status] });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Geçersiz sipariş durumu.' });
    }
    res.status(500).json({ error: 'Sipariş durumu güncellenemedi' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      select: { id: true, buyerId: true, sellerId: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Sohbet bulunamadı' });
    }

    await prisma.conversation.update({
      where: { id },
      data:
        conversation.buyerId === userId
          ? { buyerArchivedAt: new Date() }
          : { sellerArchivedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Sohbet kaldırılamadı' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

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
                companyName: true,
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
          select: { id: true, name: true, email: true, role: true, companyName: true },
        },
        seller: {
          select: { id: true, name: true, email: true, role: true, companyName: true },
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
      senderName: getUserDisplayName(msg.sender),
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
        name: getUserDisplayName(participant),
        email: participant.email,
        role: isBuyer ? 'seller' : 'buyer',
      },
      messages,
      updatedAt: conversation.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Sohbet alınamadı' });
  }
});

router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content, isQuote, quoteAmount } = messageSchema.parse(req.body);
    const senderId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        ...visibleConversationWhere(senderId),
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
          select: { id: true, name: true, role: true, companyName: true },
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
      senderName: getUserDisplayName(message.sender),
      senderRole: message.senderId === conversation.buyerId ? 'user' : 'seller',
      content: message.content,
      timestamp: message.createdAt,
      isQuote: message.isQuote,
      quoteAmount: message.quoteAmount,
      quoteCurrency: message.quoteCurrency,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Mesaj içeriği geçerli değil.' });
    }
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
});

export default router;
