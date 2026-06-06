"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const router = (0, express_1.Router)();
const modelServiceUrl = process.env.PRINT_QUALITY_MODEL_URL?.trim();
const upload = (0, multer_1.default)({
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
    },
});
const defectCopy = {
    healthy: {
        label: 'Hata belirgin değil',
        severity: 'low',
        summary: 'Fotoğrafta belirgin bir FDM baskı hatası görünmüyor. Sonuç yine de ışık, açı ve görüntü netliğine bağlıdır.',
        recommendations: [
            'Aynı parçayı farklı açıdan bir fotoğrafla tekrar kontrol edin.',
            'İlk katman, köşe yapışması ve yüzey çizgilerini gözle inceleyin.',
            'Satıcıya malzeme, katman yüksekliği ve doluluk oranı bilgisini ekleyin.',
        ],
    },
    warping: {
        label: 'Warping / köşe kalkması',
        severity: 'medium',
        summary: 'Parçanın köşe veya taban bölümünde tabla yüzeyinden ayrılmaya benzer belirtiler olabilir.',
        recommendations: [
            'Tabla sıcaklığını malzemeye uygun aralıkta sabitleyin.',
            'İlk katman yüksekliğini ve tabla kalibrasyonunu kontrol edin.',
            'Brim/raft kullanın ve baskı alanındaki hava akımını azaltın.',
        ],
    },
    stringing: {
        label: 'Stringing / ince ipliklenme',
        severity: 'medium',
        summary: 'Model çevresinde ince plastik ipliklenme veya akma belirtisi olabilir.',
        recommendations: [
            'Retract mesafesi ve retract hızını artırarak test baskısı alın.',
            'Nozul sıcaklığını küçük adımlarla düşürün.',
            'Filamentin nem almadığından emin olun.',
        ],
    },
    layer_shift: {
        label: 'Layer shifting / katman kayması',
        severity: 'high',
        summary: 'Katmanların yatay eksende kaymış görünmesine benzer bir hata ihtimali var.',
        recommendations: [
            'Kayış gerginliği, kasnak vidaları ve ray hareketini kontrol edin.',
            'Baskı hızını ve ivmelenme değerlerini düşürün.',
            'Nozulun modele çarpmasına neden olan taşma veya tabla sorunu olup olmadığını inceleyin.',
        ],
    },
    cracking: {
        label: 'Cracking / katman çatlaması',
        severity: 'high',
        summary: 'Parçada katman ayrılması veya çatlak oluşmasına benzer belirti olabilir.',
        recommendations: [
            'Nozul sıcaklığını malzemeye uygun aralıkta biraz artırmayı deneyin.',
            'Soğutma fanını azaltın ve baskı ortamındaki ani sıcaklık değişimini engelleyin.',
            'Katman yüksekliğini ve baskı hızını düşürerek katman bağını güçlendirin.',
        ],
    },
    off_platform: {
        label: 'Off-platform / tabladan ayrılma',
        severity: 'high',
        summary: 'Baskının tabla yüzeyinden ayrılması veya konumunu kaybetmesine benzer belirti olabilir.',
        recommendations: [
            'Tabla kalibrasyonu ve Z offset değerini yeniden ayarlayın.',
            'Tabla yüzeyini temizleyin ve gerekirse brim/raft kullanın.',
            'İlk katman hızını düşürün ve tabla sıcaklığını malzemeye göre sabitleyin.',
        ],
    },
};
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function chooseDemoDefect(file) {
    const bytes = file.buffer;
    const sampleSize = Math.min(bytes.length, 60000);
    let total = 0;
    let bright = 0;
    let contrast = 0;
    let previous = bytes[0] || 0;
    for (let index = 0; index < sampleSize; index += 1) {
        const value = bytes[index];
        total += value;
        if (value > 210)
            bright += 1;
        contrast += Math.abs(value - previous);
        previous = value;
    }
    const mean = total / Math.max(sampleSize, 1);
    const brightRatio = bright / Math.max(sampleSize, 1);
    const textureScore = contrast / Math.max(sampleSize, 1);
    let key = 'healthy';
    if (textureScore > 82 && brightRatio > 0.12)
        key = 'stringing';
    else if (textureScore > 95)
        key = 'off_platform';
    else if (mean < 82)
        key = 'layer_shift';
    else if (mean > 160 && textureScore > 55)
        key = 'cracking';
    else if (brightRatio < 0.035 && mean > 120)
        key = 'warping';
    const confidence = clamp(0.54 + textureScore / 420 + brightRatio / 5, 0.55, 0.86);
    return {
        key,
        ...defectCopy[key],
        confidence: Number(confidence.toFixed(2)),
        source: 'demo-heuristic',
    };
}
async function analyzeWithModelService(file) {
    if (!modelServiceUrl)
        return null;
    const formData = new form_data_1.default();
    formData.append('image', file.buffer, {
        filename: file.originalname || 'print.jpg',
        contentType: file.mimetype,
    });
    const response = await axios_1.default.post(modelServiceUrl, formData, {
        headers: formData.getHeaders(),
        timeout: 45000,
        maxBodyLength: Infinity,
    });
    const predictedKey = String(response.data?.key || '').trim();
    if (!Object.prototype.hasOwnProperty.call(defectCopy, predictedKey)) {
        throw new Error('Model servisi geçersiz hata sınıfı döndürdü.');
    }
    const confidence = typeof response.data?.confidence === 'number' ? response.data.confidence : 0.75;
    return {
        key: predictedKey,
        ...defectCopy[predictedKey],
        confidence: Number(clamp(confidence, 0, 1).toFixed(2)),
        source: 'trained-model',
    };
}
router.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Analiz için bir baskı fotoğrafı yükleyin.' });
        }
        try {
            const modelResult = await analyzeWithModelService(file);
            if (modelResult) {
                return res.json(modelResult);
            }
        }
        catch (error) {
            console.error('Print quality model service failed:', error);
        }
        res.json(chooseDemoDefect(file));
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Baskı kalite analizi yapılamadı.' });
    }
});
exports.default = router;
