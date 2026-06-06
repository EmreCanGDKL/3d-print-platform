import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import modelRoutes from './routes/models';
import chatRoutes from './routes/chat';
import exampleRoutes from './routes/examples';
import imageRoutes from './routes/images';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const uploadsDir = path.resolve(__dirname, '../uploads');
const bootstrapPrisma = new PrismaClient();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS,
  'http://localhost:3000',
]
  .filter(Boolean)
  .flatMap((value) => value!.split(','))
  .map((value) => value.trim().replace(/\/$/, ''))
  .filter(Boolean);

async function executeSql(sql: string) {
  await bootstrapPrisma.$executeRawUnsafe(sql);
}

async function addSqliteColumnIfMissing(sql: string) {
  try {
    await executeSql(sql);
  } catch (error: any) {
    const message = String(error?.message || error);
    if (!message.toLowerCase().includes('duplicate column')) {
      throw error;
    }
  }
}

async function ensureSqliteCompatibility() {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl.startsWith('file:')) return;

  await executeSql(`
    CREATE TABLE IF NOT EXISTS "product_reviews" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "modelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "comment" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "product_reviews_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  await executeSql(`
    CREATE TABLE IF NOT EXISTS "product_questions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "modelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "question" TEXT NOT NULL,
      "answer" TEXT,
      "answerUserId" TEXT,
      "answeredAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "product_questions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "product_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "product_questions_answerUserId_fkey" FOREIGN KEY ("answerUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await executeSql('CREATE UNIQUE INDEX IF NOT EXISTS "product_reviews_modelId_userId_key" ON "product_reviews"("modelId", "userId");');
  await executeSql('CREATE INDEX IF NOT EXISTS "product_reviews_modelId_idx" ON "product_reviews"("modelId");');
  await executeSql('CREATE INDEX IF NOT EXISTS "product_reviews_userId_idx" ON "product_reviews"("userId");');
  await executeSql('CREATE INDEX IF NOT EXISTS "product_questions_modelId_idx" ON "product_questions"("modelId");');
  await executeSql('CREATE INDEX IF NOT EXISTS "product_questions_userId_idx" ON "product_questions"("userId");');
  await executeSql('CREATE INDEX IF NOT EXISTS "product_questions_answerUserId_idx" ON "product_questions"("answerUserId");');

  await addSqliteColumnIfMissing('ALTER TABLE "users" ADD COLUMN "companyName" TEXT;');
  await addSqliteColumnIfMissing('ALTER TABLE "conversations" ADD COLUMN "buyerArchivedAt" DATETIME;');
  await addSqliteColumnIfMissing('ALTER TABLE "conversations" ADD COLUMN "sellerArchivedAt" DATETIME;');

  await executeSql(`
    CREATE TABLE IF NOT EXISTS "example_items" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "prompt" TEXT NOT NULL,
      "tags" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
}

app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use('/uploads', express.static(uploadsDir));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    callback(null, allowedOrigins.includes(normalizedOrigin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

const sqliteCompatibilityReady = ensureSqliteCompatibility()
  .catch((error) => {
    console.error('Database compatibility check failed:', error);
    throw error;
  })
  .finally(() => bootstrapPrisma.$disconnect());

app.use(async (_req, res, next) => {
  try {
    await sqliteCompatibilityReady;
    next();
  } catch {
    res.status(500).json({ error: 'Veritabanı hazırlığı tamamlanamadı.' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/examples', exampleRoutes);
app.use('/api/images', imageRoutes);

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

export default app;
