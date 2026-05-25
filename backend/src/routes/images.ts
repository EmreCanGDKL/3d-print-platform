import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';

const router = Router();

type ImageSearchProvider = 'google' | 'serpapi';

type CachedSearch = {
  expiresAt: number;
  payload: ImageSearchResponse;
};

type ImageSearchItem = {
  id: string;
  title: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  thumbnailUrl?: string;
};

type ImageSearchResponse = {
  query: string;
  items: ImageSearchItem[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ITEMS = 100;
const searchCache = new Map<string, CachedSearch>();

const querySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value) => sanitizeQuery(value))
  .refine((value) => value.length > 0, 'Arama kelimesi gerekli.');

function sanitizeQuery(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F<>`"{}\\^|[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^www\./, '') || 'Kaynak site';
  }
}

function cleanResultText(value: string) {
  return value
    .replace(/\s*[-|•·]\s*(stokta|stockta|in stock|out of stock|sepete ekle|satışta)\b/gi, '')
    .replace(/\b(stokta|stockta|in stock|out of stock|sepete ekle|satışta)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-|•·]\s*$/g, '')
    .trim();
}

function cleanResultTitle(value: string) {
  return cleanResultText(value)
    .split(/\s[-|•·]\s/)
    .map((part) => part.trim())
    .filter(Boolean)[0]
    ?.slice(0, 140) || 'Gorsel sonucu';
}

function getImageSearchProvider(): ImageSearchProvider {
  const configuredProvider = String(process.env.IMAGE_SEARCH_PROVIDER || '').toLowerCase().trim();
  if (configuredProvider === 'serpapi' || configuredProvider === 'google') return configuredProvider;
  return process.env.SERPAPI_API_KEY ? 'serpapi' : 'google';
}

function normalizeGoogleItem(item: any, index: number): ImageSearchItem | null {
  const imageUrl = typeof item?.link === 'string' ? item.link : '';
  if (!/^https?:\/\//i.test(imageUrl)) return null;

  const sourceUrl =
    typeof item?.image?.contextLink === 'string' && /^https?:\/\//i.test(item.image.contextLink)
      ? item.image.contextLink
      : imageUrl;
  const title = cleanResultTitle(String(item?.title || item?.displayLink || 'Google gorsel sonucu'));
  const source = String(item?.displayLink || getDomain(sourceUrl)).slice(0, 120);
  const thumbnailUrl =
    typeof item?.image?.thumbnailLink === 'string' && /^https?:\/\//i.test(item.image.thumbnailLink)
      ? item.image.thumbnailLink
      : undefined;

  return {
    id: `${source}-${index}-${imageUrl}`.slice(0, 220),
    title,
    imageUrl,
    source,
    sourceUrl,
    thumbnailUrl,
  };
}

function normalizeSerpApiItem(item: any, index: number): ImageSearchItem | null {
  const imageUrl =
    typeof item?.original === 'string' && /^https?:\/\//i.test(item.original)
      ? item.original
      : typeof item?.thumbnail === 'string' && /^https?:\/\//i.test(item.thumbnail)
        ? item.thumbnail
        : '';
  if (!imageUrl) return null;

  const sourceUrl =
    typeof item?.link === 'string' && /^https?:\/\//i.test(item.link)
      ? item.link
      : typeof item?.source === 'string' && /^https?:\/\//i.test(item.source)
        ? item.source
        : imageUrl;
  const source = cleanResultText(String(item?.source || getDomain(sourceUrl))).slice(0, 120);
  const title = cleanResultTitle(String(item?.title || source || 'SerpApi gorsel sonucu'));
  const thumbnailUrl =
    typeof item?.thumbnail === 'string' && /^https?:\/\//i.test(item.thumbnail)
      ? item.thumbnail
      : undefined;

  return {
    id: `${source}-${index}-${imageUrl}`.slice(0, 220),
    title,
    imageUrl,
    source,
    sourceUrl,
    thumbnailUrl,
  };
}

function isImageSearchItem(item: ImageSearchItem | null): item is ImageSearchItem {
  return Boolean(item);
}

function pruneCache() {
  if (searchCache.size <= MAX_CACHE_ITEMS) return;
  const oldestKey = searchCache.keys().next().value;
  if (oldestKey) searchCache.delete(oldestKey);
}

async function fetchGoogleImages(params: Record<string, string | number>) {
  try {
    return await axios.get('https://www.googleapis.com/customsearch/v1', {
      timeout: 12000,
      params,
    });
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);
    const message = String(error?.response?.data?.error?.message || '');
    const reason = String(error?.response?.data?.error?.errors?.[0]?.reason || error?.response?.data?.error?.status || '');

    if (status === 400 && (message.toLowerCase().includes('invalid') || reason.toLowerCase().includes('invalid'))) {
      const fallbackParams = { ...params };
      delete fallbackParams.lr;
      return axios.get('https://www.googleapis.com/customsearch/v1', {
        timeout: 12000,
        params: fallbackParams,
      });
    }

    throw error;
  }
}

async function searchWithGoogle(query: string): Promise<ImageSearchItem[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!apiKey || !cx) {
    const error = new Error('Google image search is not configured.');
    (error as any).statusCode = 500;
    throw error;
  }

  const searchParams = {
    key: apiKey,
    cx,
    q: query,
    searchType: 'image',
    safe: 'active',
    imgSize: 'large',
    lr: 'lang_tr',
  };

  const firstPage = await fetchGoogleImages({ ...searchParams, num: 10, start: 1 });
  const secondPage = await fetchGoogleImages({ ...searchParams, num: 2, start: 11 });
  const googleItems = [
    ...(Array.isArray(firstPage.data?.items) ? firstPage.data.items : []),
    ...(Array.isArray(secondPage.data?.items) ? secondPage.data.items : []),
  ];

  return googleItems.map(normalizeGoogleItem).filter(isImageSearchItem).slice(0, 12);
}

async function searchWithSerpApi(query: string): Promise<ImageSearchItem[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    const error = new Error('SerpApi image search is not configured.');
    (error as any).statusCode = 500;
    throw error;
  }

  const response = await axios.get('https://serpapi.com/search.json', {
    timeout: 20000,
    params: {
      engine: 'google_images',
      q: query,
      api_key: apiKey,
      safe: 'active',
      imgsz: 'l',
      hl: 'tr',
      gl: 'tr',
    },
  });

  if (typeof response.data?.error === 'string' && response.data.error) {
    const error = new Error(response.data.error);
    (error as any).provider = 'serpapi';
    (error as any).statusCode = 502;
    throw error;
  }

  return (Array.isArray(response.data?.images_results) ? response.data.images_results : [])
    .map(normalizeSerpApiItem)
    .filter(isImageSearchItem)
    .slice(0, 12);
}

router.get('/search', async (req, res) => {
  try {
    const query = querySchema.parse(String(req.query.q || ''));
    const provider = getImageSearchProvider();
    const cacheKey = `${provider}:${query.toLocaleLowerCase('tr-TR')}`;
    const cached = searchCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }

    const payload: ImageSearchResponse = {
      query,
      items: provider === 'serpapi' ? await searchWithSerpApi(query) : await searchWithGoogle(query),
    };

    searchCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    });
    pruneCache();

    res.json(payload);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Arama kelimesi 1-80 karakter arasinda olmali.' });
    }

    const status = Number(error?.statusCode || error?.response?.status || 0);
    const reason = String(error?.response?.data?.error?.errors?.[0]?.reason || error?.response?.data?.error?.status || '');
    const message = String(error?.message || error?.response?.data?.error?.message || error?.response?.data?.error || '');
    const lowerMessage = message.toLowerCase();
    const lowerReason = reason.toLowerCase();

    if (message === 'SerpApi image search is not configured.') {
      return res.status(500).json({
        error: 'SerpApi gorsel arama anahtari eksik. SERPAPI_API_KEY degerini backend .env dosyasina ekleyin.',
      });
    }

    if (message === 'Google image search is not configured.') {
      return res.status(500).json({ error: 'Google gorsel arama yapilandirmasi eksik.' });
    }

    if (error?.provider === 'serpapi' || String(error?.response?.config?.url || '').includes('serpapi.com')) {
      if (lowerMessage.includes('invalid api key') || lowerMessage.includes('api key')) {
        return res.status(401).json({ error: 'SerpApi API key gecersiz gorunuyor. SERPAPI_API_KEY degerini kontrol edin.' });
      }
      if (lowerMessage.includes('quota') || lowerMessage.includes('limit') || lowerMessage.includes('run out')) {
        return res.status(429).json({ error: 'SerpApi arama kotasi doldu, lutfen daha sonra tekrar deneyin.' });
      }
      return res.status(502).json({ error: 'SerpApi gorsel aramasi tamamlanamadi. Lutfen API key ve hesap durumunu kontrol edin.' });
    }

    if (status === 429 || lowerReason.includes('quota') || lowerReason.includes('ratelimit') || lowerMessage.includes('quota')) {
      return res.status(429).json({ error: 'Gorsel arama kotasi doldu, lutfen daha sonra tekrar deneyin.' });
    }

    if (status === 400) {
      return res.status(400).json({
        error: 'Google arama motoru kimligi veya arama ayari gecersiz gorunuyor. Lutfen GOOGLE_CUSTOM_SEARCH_CX degerini kontrol edin.',
      });
    }

    if (status === 401 || lowerReason.includes('keyinvalid') || lowerMessage.includes('api key not valid')) {
      return res.status(401).json({
        error: 'Google API key gecersiz gorunuyor. Lutfen GOOGLE_CUSTOM_SEARCH_API_KEY degerini kontrol edin.',
      });
    }

    if (status === 403) {
      if (lowerMessage.includes('does not have the access') || lowerMessage.includes('closed to new customers')) {
        return res.status(403).json({
          error:
            'Google Custom Search JSON API bu proje icin erisime kapali gorunuyor. Google bu JSON API erisimini yeni musterilere kapatmis olabilir.',
        });
      }
      if (lowerMessage.includes('custom search') || lowerMessage.includes('access') || lowerReason.includes('accessnotconfigured')) {
        return res.status(403).json({ error: 'Google Custom Search API bu proje icin etkin degil veya erisime kapali gorunuyor.' });
      }
      return res.status(403).json({ error: 'Google gorsel arama istegi reddedildi. API key kisitlarini ve Custom Search API erisimini kontrol edin.' });
    }

    if (error?.code === 'EACCES' || error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      return res.status(502).json({
        error: 'Backend gorsel arama servisine baglanamadi. Internet baglantisini, guvenlik duvarini veya proxy ayarlarini kontrol edin.',
      });
    }

    res.status(502).json({ error: 'Gorsel arama su anda tamamlanamadi. Lutfen tekrar deneyin.' });
  }
});

export default router;
