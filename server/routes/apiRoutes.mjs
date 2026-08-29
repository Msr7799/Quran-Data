import express from 'express';
import {
  getSurah, getAllSurahs, getAllVerses, getVerse, getAudio, getAudioByReciter,
  getVersesByJuz, getSajdaVerses, getPage
} from '../controllers/surahController.mjs';
import {
  getAllReciters, getVerseTimings, getSingleVerseTiming, getAvailableSurahs,
  searchTimings, getAllAudioReciters, getAyahAudioReciters, getAyahAudio,
  getReciterImages, getSurahNames, getAyahBayahReciters, getAyahBayahReciterById,
  getAyahBayahSurah, getAyahBayahVerse
} from '../controllers/timingController.mjs';
import { handleError } from '../utils/errorUtils.mjs';

const router = express.Router();
const CANONICAL_API_BASE_URL = 'https://quran-api-msr.vercel.app/api';
const CANONICAL_DOCUMENTATION_URL = 'https://quran-api-msr.vercel.app';
const LEGACY_URL_REPLACEMENTS = new Map([
  ['https://quran-api-qklj.onrender.com/api', CANONICAL_API_BASE_URL],
  ['https://quran-api-qklj.onrender.com/docs', CANONICAL_DOCUMENTATION_URL],
  ['https://quran-api-qklj.onrender.com', CANONICAL_DOCUMENTATION_URL],
  ['https://quranapi-msr.vercel.app/api', CANONICAL_API_BASE_URL],
  ['https://quran-api-msr.vercel.app/api', CANONICAL_API_BASE_URL],
]);

function normalizeApiReference(value) {
  if (typeof value === 'string') {
    let normalized = value;
    for (const [legacyUrl, canonicalUrl] of LEGACY_URL_REPLACEMENTS) {
      normalized = normalized.split(legacyUrl).join(canonicalUrl);
    }
    return normalized;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeApiReference);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeApiReference(item)])
    );
  }

  return value;
}

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

// جميع القراء الصوتيين (من جدول audio) - 133 قارئ
router.get('/reciters', getAllAudioReciters);

// ============= Timing Routes =============
// القراء الذين لديهم توقيتات حفص كاملة - 96 قارئ
router.get('/timing/reciters', getAllReciters);
// السور المتاحة لقارئ توقيت
router.get('/timing/:reciter/surahs', getAvailableSurahs);
// توقيتات سورة كاملة لقارئ
router.get('/timing/:reciter/:surah_id', getVerseTimings);
// توقيت آية واحدة
router.get('/timing/:reciter/:surah_id/:verse_id', getSingleVerseTiming);
// البحث في التوقيتات
router.get('/timing/search', searchTimings);

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
    const db = await import('../config.mjs').then(m => m.getDatabase());
    const apiRef = await db.get('SELECT * FROM api_reference ORDER BY created_at DESC LIMIT 1');
    if (!apiRef) {
      return res.status(404).json({
        success: false,
        message: 'API reference not found',
        error: 'No API reference data available'
      });
    }
    const jsonContent = normalizeApiReference(JSON.parse(apiRef.json_content));
    jsonContent.api_info = {
      ...jsonContent.api_info,
      base_url: CANONICAL_API_BASE_URL,
      documentation_url: CANONICAL_DOCUMENTATION_URL,
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
