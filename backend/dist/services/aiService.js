"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi';
const TRIPO_API_KEY = process.env.TRIPO_API_KEY?.trim();
const HITEM3D_BASE_URL = 'https://api.hitem3d.ai';
const HITEM3D_ACCESS_KEY = process.env.HITEM3D_ACCESS_KEY?.trim();
const HITEM3D_SECRET_KEY = process.env.HITEM3D_SECRET_KEY?.trim();
let hitem3dTokenCache = null;
function hasHitem3dCredentials() {
    return Boolean(HITEM3D_ACCESS_KEY && HITEM3D_SECRET_KEY);
}
function getTripoAuthHeaders() {
    if (!TRIPO_API_KEY) {
        throw new Error('TRIPO_API_KEY yapılandırılmadı. Lütfen .env dosyanızı kontrol edin.');
    }
    return {
        Authorization: `Bearer ${TRIPO_API_KEY}`,
        'Content-Type': 'application/json',
    };
}
function getJwtExpiryMs(token) {
    const [, payload] = token.split('.');
    if (!payload)
        return null;
    try {
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    }
    catch {
        return null;
    }
}
class AIService {
    async getHitem3dAccessToken() {
        if (!HITEM3D_ACCESS_KEY || !HITEM3D_SECRET_KEY) {
            throw new Error('HITEM3D_ACCESS_KEY veya HITEM3D_SECRET_KEY yapılandırılmadı. Lütfen .env dosyanızı kontrol edin.');
        }
        if (hitem3dTokenCache && hitem3dTokenCache.expiresAt - Date.now() > 60000) {
            return hitem3dTokenCache.token;
        }
        const basicToken = Buffer.from(`${HITEM3D_ACCESS_KEY}:${HITEM3D_SECRET_KEY}`, 'utf8').toString('base64');
        const response = await axios_1.default.post(`${HITEM3D_BASE_URL}/open-api/v1/auth/token`, {}, {
            headers: {
                Authorization: `Basic ${basicToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.data?.code !== 200) {
            throw new Error(response.data?.msg || response.data?.message || 'Hitem3D token alınamadı.');
        }
        const accessToken = response.data?.data?.accessToken;
        if (!accessToken) {
            throw new Error('Hitem3D token yanıtında accessToken dönmedi.');
        }
        hitem3dTokenCache = {
            token: accessToken,
            expiresAt: getJwtExpiryMs(accessToken) || Date.now() + 50 * 60 * 1000,
        };
        return accessToken;
    }
    async generateFromText(prompt) {
        if (hasHitem3dCredentials()) {
            throw new Error('Hitem3D API şu anda metinden 3D yerine görselden 3D üretimi destekliyor. Lütfen referans görsel yükleyin.');
        }
        try {
            const response = await axios_1.default.post(`${TRIPO_BASE_URL}/task`, {
                type: 'text_to_model',
                prompt: prompt.trim(),
            }, { headers: getTripoAuthHeaders() });
            const taskId = response.data?.data?.task_id;
            if (!taskId) {
                throw new Error('Tripo API görev oluşturdu fakat task_id dönmedi.');
            }
            console.log(`[Tripo] Metinden model üretimi başladı. Görev ID: ${taskId}`);
            return { taskId, status: 'pending' };
        }
        catch (error) {
            console.error('[Tripo] generateFromText başarısız:', error.response?.data || error.message);
            throw new Error(`3D model üretimi başlatılamadı: ${error.message}`);
        }
    }
    async generateFromImage(imageBuffer, mimetype, filename = 'reference-image.jpg') {
        if (hasHitem3dCredentials()) {
            try {
                const accessToken = await this.getHitem3dAccessToken();
                const formData = new form_data_1.default();
                formData.append('images', imageBuffer, {
                    filename,
                    contentType: mimetype,
                });
                formData.append('request_type', '3');
                formData.append('resolution', process.env.HITEM3D_RESOLUTION?.trim() || '512');
                formData.append('face', process.env.HITEM3D_FACE_COUNT?.trim() || '800000');
                formData.append('model', process.env.HITEM3D_MODEL?.trim() || 'hitem3dv1.5');
                formData.append('format', '2');
                const response = await axios_1.default.post(`${HITEM3D_BASE_URL}/open-api/v1/submit-task`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        Authorization: `Bearer ${accessToken}`,
                    },
                    maxBodyLength: Infinity,
                });
                if (response.data?.code !== 200) {
                    throw new Error(response.data?.msg || response.data?.message || 'Hitem3D görev oluşturamadı.');
                }
                const taskId = response.data?.data?.task_id;
                if (!taskId) {
                    throw new Error('Hitem3D görev oluşturdu fakat task_id dönmedi.');
                }
                console.log(`[Hitem3D] Görselden model üretimi başladı. Görev ID: ${taskId}`);
                return { taskId, status: 'pending' };
            }
            catch (error) {
                console.error('[Hitem3D] generateFromImage başarısız:', error.response?.data || error.message);
                throw new Error(`Görselden model üretimi başlatılamadı: ${error.message}`);
            }
        }
        try {
            const uploadResponse = await axios_1.default.post(`${TRIPO_BASE_URL}/upload`, {
                type: mimetype,
                file: {
                    type: 'base64',
                    data: imageBuffer.toString('base64'),
                },
            }, { headers: getTripoAuthHeaders() });
            const fileToken = uploadResponse.data?.data?.image_token;
            if (!fileToken) {
                throw new Error('Tripo API görseli yükledi fakat image_token dönmedi.');
            }
            const taskResponse = await axios_1.default.post(`${TRIPO_BASE_URL}/task`, {
                type: 'image_to_model',
                file: {
                    type: 'jpg',
                    file_token: fileToken,
                },
            }, { headers: getTripoAuthHeaders() });
            const taskId = taskResponse.data?.data?.task_id;
            if (!taskId) {
                throw new Error('Tripo API görsel görevini oluşturdu fakat task_id dönmedi.');
            }
            console.log(`[Tripo] Görselden model üretimi başladı. Görev ID: ${taskId}`);
            return { taskId, status: 'pending' };
        }
        catch (error) {
            console.error('[Tripo] generateFromImage başarısız:', error.response?.data || error.message);
            throw new Error(`Görselden model üretimi başlatılamadı: ${error.message}`);
        }
    }
    async checkTaskStatus(taskId) {
        if (hasHitem3dCredentials()) {
            try {
                const accessToken = await this.getHitem3dAccessToken();
                const response = await axios_1.default.get(`${HITEM3D_BASE_URL}/open-api/v1/query-task`, {
                    params: { task_id: taskId },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (response.data?.code !== 200) {
                    const message = response.data?.msg || response.data?.message || 'Hitem3D görev durumu alınamadı.';
                    return {
                        taskId,
                        status: 'failed',
                        progress: 0,
                        message,
                    };
                }
                const taskData = response.data?.data;
                if (!taskData) {
                    throw new Error("Hitem3D API'den geçerli veri dönmedi.");
                }
                const rawStatus = (taskData.state || '').toLowerCase();
                let normalized;
                let progress = 0;
                if (rawStatus === 'success') {
                    normalized = 'success';
                    progress = 100;
                }
                else if (rawStatus === 'failed') {
                    normalized = 'failed';
                }
                else if (rawStatus === 'created' || rawStatus === 'queueing') {
                    normalized = 'queued';
                    progress = rawStatus === 'created' ? 5 : 10;
                }
                else {
                    normalized = 'running';
                    progress = 50;
                }
                console.log(`[Hitem3D] Görev: ${taskId} | Durum: ${normalized}`);
                return {
                    taskId,
                    status: normalized,
                    progress,
                    output: taskData.url ? { model: taskData.url } : undefined,
                    message: this.getStatusMessage(normalized, progress, response.data?.msg),
                };
            }
            catch (error) {
                console.error(`[Hitem3D] Durum sorgusu başarısız [${taskId}]:`, error.response?.data || error.message);
                return {
                    taskId,
                    status: 'running',
                    progress: 0,
                    message: 'Sunucu durumu kontrol ediliyor...',
                };
            }
        }
        try {
            const response = await axios_1.default.get(`${TRIPO_BASE_URL}/task/${taskId}`, {
                headers: getTripoAuthHeaders(),
            });
            const taskData = response.data?.data;
            if (!taskData) {
                throw new Error("Tripo API'den geçerli veri dönmedi.");
            }
            const rawStatus = (taskData.status || '').toLowerCase();
            const progress = typeof taskData.progress === 'number' ? taskData.progress : 0;
            let normalized;
            let modelUrl;
            if (rawStatus === 'success') {
                normalized = 'success';
                modelUrl = taskData.result?.model?.url;
            }
            else if (rawStatus === 'failed' || rawStatus === 'cancelled') {
                normalized = 'failed';
            }
            else if (rawStatus === 'queued') {
                normalized = 'queued';
            }
            else {
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
        }
        catch (error) {
            console.error(`[Tripo] Durum sorgusu başarısız [${taskId}]:`, error.response?.data || error.message);
            return {
                taskId,
                status: 'running',
                progress: 0,
                message: 'Sunucu durumu kontrol ediliyor...',
            };
        }
    }
    getStatusMessage(status, progress, failureReason) {
        if (status === 'failed')
            return failureReason || '3D model üretimi başarısız oldu.';
        if (status === 'queued')
            return 'Tripo motorunda sıraya alındı, bekleniyor...';
        if (status === 'running')
            return `Üretiliyor... %${progress}`;
        if (status === 'success')
            return 'Model başarıyla tamamlandı.';
        return 'Hazırlanıyor...';
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
