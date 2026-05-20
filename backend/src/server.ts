import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import modelRoutes from './routes/models';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_AI_RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 50 : 5;

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

const aiLimiter = rateLimit({
  windowMs: readPositiveInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: readPositiveInteger(process.env.AI_RATE_LIMIT_MAX, DEFAULT_AI_RATE_LIMIT_MAX),
  message: { error: 'AI üretim limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
});

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

export default app;
