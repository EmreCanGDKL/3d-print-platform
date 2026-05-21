"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const ai_1 = __importDefault(require("./routes/ai"));
const models_1 = __importDefault(require("./routes/models"));
const chat_1 = __importDefault(require("./routes/chat"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const DEFAULT_AI_RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 50 : 5;
const bootstrapPrisma = new client_1.PrismaClient();
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
    'http://localhost:3000',
]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
function readPositiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
async function executeSql(sql) {
    await bootstrapPrisma.$executeRawUnsafe(sql);
}
async function addSqliteColumnIfMissing(sql) {
    try {
        await executeSql(sql);
    }
    catch (error) {
        const message = String(error?.message || error);
        if (!message.toLowerCase().includes('duplicate column')) {
            throw error;
        }
    }
}
async function ensureSqliteCompatibility() {
    const databaseUrl = process.env.DATABASE_URL || '';
    if (!databaseUrl.startsWith('file:'))
        return;
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
}
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
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
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: readPositiveInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: readPositiveInteger(process.env.AI_RATE_LIMIT_MAX, DEFAULT_AI_RATE_LIMIT_MAX),
    message: { error: 'AI üretim limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
});
app.use(express_1.default.json({ limit: '10mb' }));
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
    }
    catch {
        res.status(500).json({ error: 'Veritabanı hazırlığı tamamlanamadı.' });
    }
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_1.default);
app.use('/api/ai', aiLimiter, ai_1.default);
app.use('/api/models', models_1.default);
app.use('/api/chat', chat_1.default);
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});
exports.default = app;
