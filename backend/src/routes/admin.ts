import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { isAdminUser } from '../utils/admin';

const router = Router();
const prisma = new PrismaClient();

const emailSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

function requireAdmin(req: AuthRequest, res: any) {
  if (!req.user || !isAdminUser(req.user)) {
    res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli.' });
    return false;
  }
  return true;
}

async function listBlockedEmails() {
  return prisma.$queryRawUnsafe<Array<{ email: string; createdAt: Date | string }>>(
    'SELECT email, "createdAt" FROM "blocked_emails" ORDER BY "createdAt" DESC',
  );
}

router.get('/overview', authenticateToken, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const [users, models, blockedEmails] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          createdAt: true,
          _count: { select: { aiModels: true, buyerConversations: true, sellerConversations: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.model.findMany({
        where: { status: { not: 'INACTIVE' } },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          category: true,
          priceRangeMin: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      listBlockedEmails(),
    ]);

    res.json({
      users: users.map((user) => ({
        ...user,
        effectiveRole: isAdminUser(user) ? 'ADMIN' : user.role,
      })),
      models,
      blockedEmails,
    });
  } catch {
    res.status(500).json({ error: 'Admin verileri alınamadı.' });
  }
});

router.post('/blocked-emails', authenticateToken, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { email } = emailSchema.parse(req.body);
    await prisma.$executeRaw`
      INSERT INTO "blocked_emails" ("email", "createdAt")
      VALUES (${email}, CURRENT_TIMESTAMP)
      ON CONFLICT ("email") DO NOTHING
    `;
    res.status(201).json({ success: true, blockedEmails: await listBlockedEmails() });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Geçerli bir e-posta girin.' });
    }
    res.status(500).json({ error: 'E-posta engellenemedi.' });
  }
});

router.delete('/blocked-emails/:email', authenticateToken, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    await prisma.$executeRaw`DELETE FROM "blocked_emails" WHERE "email" = ${email}`;
    res.json({ success: true, blockedEmails: await listBlockedEmails() });
  } catch {
    res.status(500).json({ error: 'E-posta engeli kaldırılamadı.' });
  }
});

router.delete('/models/:modelId', authenticateToken, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const model = await prisma.model.findUnique({ where: { id: req.params.modelId }, select: { id: true } });
    if (!model) return res.status(404).json({ error: 'Ürün bulunamadı.' });

    await prisma.model.update({
      where: { id: model.id },
      data: { status: 'INACTIVE' },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Ürün kaldırılamadı.' });
  }
});

router.delete('/users/:userId', authenticateToken, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, email: true, role: true },
    });

    if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (target.id === req.user!.id) return res.status(400).json({ error: 'Kendi admin hesabınızı silemezsiniz.' });
    if (isAdminUser(target)) return res.status(400).json({ error: 'Admin hesabı silinemez.' });

    await prisma.$transaction(async (tx) => {
      const ownedModels = await tx.model.findMany({ where: { userId: target.id }, select: { id: true } });
      const ownedModelIds = ownedModels.map((model) => model.id);
      const conversations = await tx.conversation.findMany({
        where: {
          OR: [
            { buyerId: target.id },
            { sellerId: target.id },
            ...(ownedModelIds.length ? [{ modelId: { in: ownedModelIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const conversationIds = conversations.map((conversation) => conversation.id);

      if (conversationIds.length) {
        await tx.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
        await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
      }

      await tx.message.deleteMany({ where: { senderId: target.id } });
      await tx.productReview.deleteMany({
        where: {
          OR: [{ userId: target.id }, ...(ownedModelIds.length ? [{ modelId: { in: ownedModelIds } }] : [])],
        },
      });
      await tx.productQuestion.updateMany({ where: { answerUserId: target.id }, data: { answerUserId: null, answer: null, answeredAt: null } });
      await tx.productQuestion.deleteMany({
        where: {
          OR: [{ userId: target.id }, ...(ownedModelIds.length ? [{ modelId: { in: ownedModelIds } }] : [])],
        },
      });
      await tx.model.deleteMany({ where: { userId: target.id } });
      await tx.user.delete({ where: { id: target.id } });
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Kullanıcı silinemedi.' });
  }
});

export default router;
