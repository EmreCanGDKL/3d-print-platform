import axios from 'axios';
import FormData from 'form-data';

const TRIPO_API_KEY = process.env.TRIPO_API_KEY;

export class AIService {
  async generateFromText(prompt: string) {
    if (!TRIPO_API_KEY) throw new Error('TRIPO_API_KEY not configured');

    const response = await axios.post(
      'https://api.tripo3d.ai/v2/openapi/task',
      {
        type: 'text_to_model',
        prompt: prompt,
        model_version: 'v2.5-20250123',
        face_limit: 30000,
        texture: true,
        pbr: true
      },
      {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Tripo API error');
    }

    return {
      taskId: response.data.data.task_id,
      status: 'pending'
    };
  }

  async generateFromImage(imageBuffer: Buffer, mimetype: string) {
    if (!TRIPO_API_KEY) throw new Error('TRIPO_API_KEY not configured');

    // Upload image
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'upload.jpg',
      contentType: mimetype
    });

    const uploadResponse = await axios.post(
      'https://api.tripo3d.ai/v2/openapi/upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`,
          ...formData.getHeaders()
        }
      }
    );

    if (uploadResponse.data.code !== 0) {
      throw new Error('Failed to upload image');
    }

    const fileToken = uploadResponse.data.data.image_token;

    // Create task
    const response = await axios.post(
      'https://api.tripo3d.ai/v2/openapi/task',
      {
        type: 'image_to_model',
        file: {
          type: 'jpg',
          file_token: fileToken
        },
        model_version: 'v2.5-20250123',
        face_limit: 30000,
        texture: true,
        pbr: true
      },
      {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Tripo API error');
    }

    return {
      taskId: response.data.data.task_id,
      status: 'pending'
    };
  }

  async checkTaskStatus(taskId: string) {
    if (!TRIPO_API_KEY) throw new Error('TRIPO_API_KEY not configured');

    const response = await axios.get(
      `https://api.tripo3d.ai/v2/openapi/task/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Failed to check status');
    }

    const task = response.data.data;
    
    return {
      taskId: task.task_id,
      status: task.status,
      progress: task.progress || 0,
      output: task.output,
      message: this.getStatusMessage(task.status, task.progress)
    };
  }

  private getStatusMessage(status: string, progress: number): string {
    switch (status) {
      case 'queued': return 'Kuyrukta bekliyor...';
      case 'running': return `İşleniyor... %${progress}`;
      case 'success': return 'Tamamlandı!';
      case 'failed': return 'Başarısız oldu';
      default: return 'Bekleniyor...';
    }
  }
}

export const aiService = new AIService();