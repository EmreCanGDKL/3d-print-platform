import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(120).optional().or(z.literal('')),
  role: z.enum(['USER', 'SELLER']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(120).optional().or(z.literal('')),
});

const emailSchema = z.object({
  email: z.string().email(),
  currentPassword: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

function toSafeUser(user: { id: string; email: string; name: string; role: string; companyName?: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyName: user.companyName || null,
    displayName: user.role === 'SELLER' ? user.companyName || user.name : user.name,
  };
}

function createToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };

  return jwt.sign({ userId }, secret, options);
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, companyName } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        companyName: role === 'SELLER' ? companyName || name : null,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
      },
    });

    const token = createToken(user.id);

    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Lütfen geçerli hesap bilgileri girin.' });
    }
    res.status(500).json({ error: 'Kayıt işlemi tamamlanamadı.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const token = createToken(user.id);

    res.json({
      token,
      user: toSafeUser(user),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'E-posta veya şifre formatı geçersiz.' });
    }
    res.status(500).json({ error: 'Giriş işlemi tamamlanamadı.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, companyName: true },
    });

    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json({ user: toSafeUser(user) });
  } catch {
    res.status(403).json({ error: 'Oturum geçersiz.' });
  }
});

router.patch('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, secret) as { userId: string };
    const body = profileSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    if (!existingUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        name: body.name,
        companyName: existingUser.role === 'SELLER' ? body.companyName || body.name : null,
      },
      select: { id: true, email: true, name: true, role: true, companyName: true },
    });

    res.json({ user: toSafeUser(user), message: 'Profil bilgileri güncellendi.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Profil bilgileri eksik veya geçersiz.' });
    }
    res.status(500).json({ error: 'Profil güncellenemedi.' });
  }
});

router.patch('/email', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, secret) as { userId: string };
    const body = emailSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
    }

    const emailOwner = await prisma.user.findUnique({ where: { email: body.email } });
    if (emailOwner && emailOwner.id !== user.id) {
      return res.status(400).json({ error: 'Bu e-posta adresi başka bir hesapta kullanılıyor.' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: body.email },
      select: { id: true, email: true, name: true, role: true, companyName: true },
    });

    res.json({ user: toSafeUser(updated), message: 'E-posta güncellendi.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'E-posta bilgileri geçersiz.' });
    }
    res.status(500).json({ error: 'E-posta güncellenemedi.' });
  }
});

router.patch('/password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, secret) as { userId: string };
    const body = passwordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Şifre güncellendi.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
    }
    res.status(500).json({ error: 'Şifre güncellenemedi.' });
  }
});

export default router;
