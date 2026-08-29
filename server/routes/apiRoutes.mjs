import express from 'express';
import {
  getSurah, getAllSurahs, getAllVerses, getVerse, getAudio, getAudioByReciter,
  getVersesByJuz, getSajdaVerses, getPage
} from '../controllers/surahController.mjs';
import {
  getAllAudioReciters, getAyahAudioReciters, getAyahAudio,
  getReciterImages, getSurahNames, getAyahBayahReciters, getAyahBayahReciterById,
  getAyahBayahSurah, getAyahBayahVerse
} from '../controllers/timingController.mjs';
import { handleError } from '../utils/errorUtils.mjs';
import config, { getDatabase } from '../config.mjs';

const router = express.Router();


function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0];
  return String(value || '').split(',')[0].trim();
}

function isLocalHost(host = '') {
  const normalized = String(host || '').trim().toLowerCase();
  if (normalized.startsWith('[::1]')) return true;
  const hostname = normalized.split(':')[0];
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Resolve the public origin used in URLs returned by the API.
 * - localhost / 127.0.0.1 => use the actual local host + port from the request.
 * - Vercel/remote requests => always advertise the official production domain.
 */
function resolvePublicOrigin(req) {
  const forwardedHost = firstHeaderValue(req.headers['x-forwarded-host']);
  const host = forwardedHost || req.get('host') || '';

  if (isLocalHost(host)) {
    const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
    const protocol = forwardedProto || req.protocol || 'http';
    return `${protocol}://${host}`.replace(/\/$/, '');
  }

  return config.productionOrigin;
}

function getUrlContext(req) {
  const origin = resolvePublicOrigin(req);
  return {
    origin,
    apiBaseUrl: `${origin}/api`,
    documentationUrl: `${origin}/docs`,
    readerUrl: `${origin}/index.html`,
    isLocal: /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(?::\d+)?$/i.test(origin)
  };
}

/**
 * Normalize only project-internal absolute URLs that may exist in older
 * generated API-reference records, without keeping historical project
 * domains in source code.
 *
 * External audio/CDN/API providers are left untouched.
 */
function normalizeApiReference(value, urlContext) {
  if (typeof value === 'string') {
    const deploymentHostPattern =
      /https?:\/\/[^/\\s"'`]+\.(?:vercel\.app|onrender\.com)(?=\/(?:api|docs|index\.html)(?:\/|$))/gi;
    const localHostPattern =
      /http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?=\/(?:api|docs|index\.html)(?:\/|$))/gi;

    return value
      .replace(deploymentHostPattern, urlContext.origin)
      .replace(localHostPattern, urlContext.origin);
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeApiReference(item, urlContext));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeApiReference(item, urlContext)])
    );
  }

  return value;
}

// API root / discovery endpoint
router.get('/', (req, res) => {
  const urls = getUrlContext(req);
  const endpointPaths = [
    '/surahs',
    '/surah/:surah_id',
    '/verses/:surah_id',
    '/verse/:surah_id/:verse_id',
    '/juz/:juz_id',
    '/pages/:surah_id/:verse_id',
    '/sajda',
    '/audio/:surah_id',
    '/audio/:surah_id/:reciter',
    '/reciters',
    '/ayah-audio/reciters',
    '/ayah-audio/:reciter/:surah_id/:verse_id',
    '/reciter-images',
    '/surah-names',
    '/ayah-bayah/reciters',
    '/ayah-bayah/reciter/:reciter_id',
    '/ayah-bayah/:reciter_id/:surah_id',
    '/ayah-bayah/:reciter_id/:surah_id/:verse_id',
    '/api-reference'
  ];

  res.json({
    success: true,
    name: 'Quran Data API',
    version: '3.1.0',
    environment: urls.isLocal ? 'local' : 'production',
    base_url: urls.apiBaseUrl,
    documentation_url: urls.documentationUrl,
    reader_url: urls.readerUrl,
    official_site: {
      origin: config.productionOrigin,
      api: config.productionApiBaseUrl,
      docs: `${config.productionOrigin}/docs`
    },
    local_development: {
      origin: urls.isLocal ? urls.origin : config.localOrigin,
      api: urls.isLocal ? urls.apiBaseUrl : config.localApiBaseUrl,
      docs: `${urls.isLocal ? urls.origin : config.localOrigin}/docs`
    },
    endpoints: endpointPaths.map(path => ({
      method: 'GET',
      path: `/api${path}`,
      url: `${urls.apiBaseUrl}${path}`
    }))
  });
});

// سور وآيات
router.get('/surahs', getAllSurahs);
router.get('/surah/:surah_id?', getSurah);
router.get('/verses/:surah_id?', getAllVerses);
router.get('/verse/:surah_id?/:verse_id?', getVerse);

// أجزاء وصفحات وسجدة
router.get('/juz/:juz_id?', getVersesByJuz);
router.get('/pages/:surah_id?/:verse_id?', getPage);
router.get('/sajda', getSajdaVerses);

// الصوتيات
router.get('/audio/:surah_id?', getAudio); // جميع الملفات الصوتية لسورة
router.get('/audio/:surah_id/:reciter', getAudioByReciter); // ملفات صوتية لقارئ معيّن وسورة

// جميع القراء الصوتيين (من جدول audio) - 158 قارئ
router.get('/reciters', getAllAudioReciters);

// ============= Verse-by-Verse Audio Routes =============
// قراء الصوت آية-بآية
router.get('/ayah-audio/reciters', getAyahAudioReciters);
// رابط صوت آية واحدة لقارئ محدد
router.get('/ayah-audio/:reciter/:surah_id/:verse_id', getAyahAudio);

// ============= Reciter Metadata & Images =============
router.get('/reciter-images', getReciterImages);
router.get('/surah-names', getSurahNames);
router.get('/ayah-bayah/reciters', getAyahBayahReciters);
router.get('/ayah-bayah/reciter/:reciter_id', getAyahBayahReciterById);
router.get('/ayah-bayah/:reciter_id/:surah_id', getAyahBayahSurah);
router.get('/ayah-bayah/:reciter_id/:surah_id/:verse_id', getAyahBayahVerse);

// ============= API Reference =============
router.get('/api-reference', async (req, res) => {
  try {
    const db = await getDatabase();
    const apiRef = await db.get('SELECT * FROM api_reference ORDER BY created_at DESC LIMIT 1');

    if (!apiRef) {
      return res.status(404).json({
        success: false,
        message: 'API reference not found',
        error: 'No API reference data available'
      });
    }

    const urls = getUrlContext(req);
    const jsonContent = normalizeApiReference(JSON.parse(apiRef.json_content), urls);

    jsonContent.api_info = {
      ...jsonContent.api_info,
      base_url: urls.apiBaseUrl,
      documentation_url: urls.documentationUrl,
      reader_url: urls.readerUrl,
      environments: {
        official_site: {
          origin: config.productionOrigin,
          api_base_url: config.productionApiBaseUrl,
          documentation_url: `${config.productionOrigin}/docs`
        },
        local_development: {
          origin: urls.isLocal ? urls.origin : config.localOrigin,
          api_base_url: urls.isLocal ? urls.apiBaseUrl : config.localApiBaseUrl,
          documentation_url: `${urls.isLocal ? urls.origin : config.localOrigin}/docs`
        }
      },
      current_environment: urls.isLocal ? 'local' : 'production',
      deployment: {
        ...jsonContent.api_info?.deployment,
        platform: 'Vercel'
      }
    };

    res.json({
      success: true,
      data: {
        ...jsonContent,
        database_info: {
          id: apiRef.id,
          title: apiRef.title,
          version: apiRef.version,
          last_updated: apiRef.last_updated,
          created_at: apiRef.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API reference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API reference',
      error: error.message
    });
  }
});

// 404 handler
router.use((req, res) => {
  handleError(res, 404, '404 - The requested resource was not found in /api/', {
    message: 'The requested URL was not found on this server.',
  });
});

export default router;
