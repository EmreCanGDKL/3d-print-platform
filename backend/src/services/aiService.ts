import 'dotenv/config';
import axios from 'axios';

const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi';
const TRIPO_API_KEY = process.env.TRIPO_API_KEY?.trim();

export type TaskStatusNormalized = 'queued' | 'running' | 'success' | 'failed';

export type TaskStatusResult = {
  taskId: string;
  status: TaskStatusNormalized;
  progress: number;
  output?: { model: string };
  message: string;
};

function getAuthHeaders() {
  if (!TRIPO_API_KEY) {
    throw new Error('TRIPO_API_KEY yapılandırılmadı. Lütfen .env dosyanızı kontrol edin.');
  }

  return {
    Authorization: `Bearer ${TRIPO_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export class AIService {
  async generateFromText(prompt: string): Promise<{ taskId: string; status: string }> {
    try {
      const response = await axios.post(
        `${TRIPO_BASE_URL}/task`,
        {
          type: 'text_to_model',
          prompt: prompt.trim(),
        },
        { headers: getAuthHeaders() },
      );

      const taskId = response.data?.data?.task_id;

      if (!taskId) {
        throw new Error('Tripo API görev oluşturdu fakat task_id dönmedi.');
      }

      console.log(`[Tripo] Metinden model üretimi başladı. Görev ID: ${taskId}`);
      return { taskId, status: 'pending' };
    } catch (error: any) {
      console.error('[Tripo] generateFromText başarısız:', error.response?.data || error.message);
      throw new Error(`3D model üretimi başlatılamadı: ${error.message}`);
    }
  }

  async generateFromImage(imageBuffer: Buffer, mimetype: string): Promise<{ taskId: string; status: string }> {
    try {
      const uploadResponse = await axios.post(
        `${TRIPO_BASE_URL}/upload`,
        {
          type: mimetype,
          file: {
            type: 'base64',
            data: imageBuffer.toString('base64'),
          },
        },
        { headers: getAuthHeaders() },
      );

      const fileToken = uploadResponse.data?.data?.image_token;

      if (!fileToken) {
        throw new Error('Tripo API görseli yükledi fakat image_token dönmedi.');
      }

      const taskResponse = await axios.post(
        `${TRIPO_BASE_URL}/task`,
        {
          type: 'image_to_model',
          file: {
            type: 'jpg',
            file_token: fileToken,
          },
        },
        { headers: getAuthHeaders() },
      );

      const taskId = taskResponse.data?.data?.task_id;

      if (!taskId) {
        throw new Error('Tripo API görsel görevini oluşturdu fakat task_id dönmedi.');
      }

      console.log(`[Tripo] Görselden model üretimi başladı. Görev ID: ${taskId}`);
      return { taskId, status: 'pending' };
    } catch (error: any) {
      console.error('[Tripo] generateFromImage başarısız:', error.response?.data || error.message);
      throw new Error(`Görselden model üretimi başlatılamadı: ${error.message}`);
    }
  }

  async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
    try {
      const response = await axios.get(`${TRIPO_BASE_URL}/task/${taskId}`, {
        headers: getAuthHeaders(),
      });

      const taskData = response.data?.data;

      if (!taskData) {
        throw new Error("Tripo API'den geçerli veri dönmedi.");
      }

      const rawStatus = (taskData.status || '').toLowerCase();
      const progress = typeof taskData.progress === 'number' ? taskData.progress : 0;

      let normalized: TaskStatusNormalized;
      let modelUrl: string | undefined;

      if (rawStatus === 'success') {
        normalized = 'success';
        modelUrl = taskData.result?.model?.url;
      } else if (rawStatus === 'failed' || rawStatus === 'cancelled') {
        normalized = 'failed';
      } else if (rawStatus === 'queued') {
        normalized = 'queued';
      } else {
        normalized = 'running';
      }

      console.log(`[Tripo] Görev: ${taskId} | %${progress} | Durum: ${normalized}`);

      return {
        taskId,
        status: normalized,
        progress,
        output: modelUrl ? { model: modelUrl } : undefined,
        message: this.getStatusMessage(normalized, progress, taskData.error?.message),
      };
    } catch (error: any) {
      console.error(`[Tripo] Durum sorgusu başarısız [${taskId}]:`, error.response?.data || error.message);

      return {
        taskId,
        status: 'running',
        progress: 0,
        message: 'Sunucu durumu kontrol ediliyor...',
      };
    }
  }

  private getStatusMessage(
    status: TaskStatusNormalized,
    progress: number,
    failureReason?: string | null,
  ): string {
    if (status === 'failed') return failureReason || '3D model üretimi başarısız oldu.';
    if (status === 'queued') return 'Tripo motorunda sıraya alındı, bekleniyor...';
    if (status === 'running') return `Üretiliyor... %${progress}`;
    if (status === 'success') return 'Model başarıyla tamamlandı.';
    return 'Hazırlanıyor...';
  }
}

export const aiService = new AIService();
