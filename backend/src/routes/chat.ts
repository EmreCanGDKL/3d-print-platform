import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/new', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { modelId, type, sellerId } = req.body;
    const buyerId = req.user!.id;

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { user: true }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model bulunamadı' });
    }

    const finalSellerId = sellerId || model.userId;

    const existingConvo = await prisma.conversation.findFirst({
      where: {
        buyerId,
        modelId,
        sellerId: finalSellerId
      }
    });

    if (existingConvo) {
      return res.json({ conversationId: existingConvo.id });
    }

    const conversation = await prisma.conversation.create({
      data: {
        buyerId,
        sellerId: finalSellerId,
        modelId,
        modelType: type === 'AI' ? 'AI' : 'CATALOG',
        status: 'ACTIVE'
      }
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: buyerId,
        content: `Bu model için fiyat teklifi almak istiyorum: ${model.name || modelId}`,
        isQuote: false
      }
    });

    res.json({ conversationId: conversation.id });

  } catch (error: any) {
    res.status(500).json({ error: 'Sohbet oluşturulamadı' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        model: {
          select: {
            id: true,
            name: true,
            type: true,
            metadata: true
          }
        },
        buyer: {
          select: { id: true, name: true }
        },
        seller: {
          select: { id: true, name: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Sohbet bulunamadı' });
    }

    const isBuyer = conversation.buyerId === userId;
    const participant = isBuyer ? conversation.seller : conversation.buyer;

    const messages = conversation.messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      senderRole: msg.senderId === conversation.buyerId ? 'user' : 'seller',
      content: msg.content,
      timestamp: msg.createdAt,
      isQuote: msg.isQuote,
      quoteAmount: msg.quoteAmount
    }));

    res.json({
      id: conversation.id,
      modelId: conversation.modelId,
      modelName: conversation.model.name,
      modelType: conversation.modelType,
      participant: {
        id: participant.id,
        name: participant.name,
        role: 'seller'
      },
      messages,
      updatedAt: conversation.updatedAt
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Sohbet alınamadı' });
  }
});

router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content, isQuote, quoteAmount } = req.body;
    const senderId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { buyerId: senderId },
          { sellerId: senderId }
        ]
      }
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
        quoteAmount: quoteAmount || null
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.json({
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderRole: message.senderId === conversation.buyerId ? 'user' : 'seller',
      content: message.content,
      timestamp: message.createdAt,
      isQuote: message.isQuote,
      quoteAmount: message.quoteAmount
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
});

export default router;