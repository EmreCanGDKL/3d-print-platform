import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { processModelForSecureViewing } from '../services/modelProcessor';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece görsel dosyaları kabul edilir'));
    }
  }
});

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/generate', authenticateToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { type, prompt } = req.body;
    const userId = req.user!.id;

    let result;

    if (type === 'text') {
      if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Prompt gerekli' });
      }
      result = await aiService.generateFromText(prompt);
    } else if (type === 'image') {
      if (!req.file) {
        return res.status(400).json({ error: 'Görsel gerekli' });
      }
      result = await aiService.generateFromImage(req.file.buffer, req.file.mimetype);
    } else {
      return res.status(400).json({ error: 'Geçersiz tip' });
    }

    const model = await prisma.model.create({
      data: {
        userId,
        type: 'AI',
        status: 'PENDING',
        prompt: type === 'text' ? prompt : null,
        viewerDataKey: result.taskId,
        generationType: type as any as string
      }
    });

    res.json({
      modelId: model.id,
      taskId: result.taskId,
      status: 'pending'
    });

  } catch (error: any) {
    console.error('AI Generation error:', error);
    res.status(500).json({
      error: error.message || 'Model oluşturma başarısız oldu'
    });
  }
});

router.get('/status/:taskId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const model = await prisma.model.findFirst({
      where: {
        userId,
        viewerDataKey: taskId
      }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model bulunamadı' });
    }

    const status = await aiService.checkTaskStatus(taskId);

    if (status.status === 'success' && status.output?.model) {
      try {
        const modelUrl = status.output.model;
        const modelResponse = await axios.get(modelUrl, {
          responseType: 'arraybuffer',
          timeout: 60000
        });

        const modelBuffer = Buffer.from(modelResponse.data);

        const originalKey = `originals/${userId}/${model.id}.stl`;
        const originalPath = path.join(uploadsDir, originalKey);
        fs.mkdirSync(path.dirname(originalPath), { recursive: true });
        fs.writeFileSync(originalPath, modelBuffer);

        const secureData = await processModelForSecureViewing(modelBuffer);

        const viewerKey = `viewers/${userId}/${model.id}.json`;
        const viewerPath = path.join(uploadsDir, viewerKey);
        fs.mkdirSync(path.dirname(viewerPath), { recursive: true });
        fs.writeFileSync(viewerPath, JSON.stringify(secureData));

        await prisma.model.update({
          where: { id: model.id },
          data: {
            status: 'COMPLETED',
            originalStorageKey: originalKey,
            viewerDataKey: viewerKey,
            vertexCount: secureData.metadata.vertexCount,
            volume: secureData.metadata.volume,
            surfaceArea: secureData.metadata.surfaceArea,
            taskId,
            generationType: model.generationType
          } as  any
        });

        return res.json({
          modelId: model.id,
          status: 'completed',
          progress: 100,
          message: 'Tamamlandı!'
        });

      } catch (processError) {
        console.error('Model processing error:', processError);
        await prisma.model.update({
          where: { id: model.id },
          data: { status: 'FAILED' }
        });
        return res.json({
          modelId: model.id,
          status: 'failed',
          message: 'İşleme hatası'
        });
      }
    }

    if (status.status === 'running' || status.status === 'queued') {
      await prisma.model.update({
        where: { id: model.id },
        data: { status: 'PROCESSING' }
      });
    }

    res.json({
      modelId: model.id,
      status: status.status,
      progress: status.progress,
      message: status.message
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: error.message || 'Durum kontrolü başarısız'
    });
  }
});

router.get('/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const models = await prisma.model.findMany({
      where: {
        userId,
        type: 'AI'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        prompt: true,
        metadata: true,
        createdAt: true
      }
    });

    res.json(models);
  } catch (error: any) {
    res.status(500).json({ error: 'Geçmiş alınamadı' });
  }
});

export default router;