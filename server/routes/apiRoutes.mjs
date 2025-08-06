import express from 'express';
import {
  getSurah, getAllSurahs, getAllVerses, getVerse, getAudio, getAudioByReciter,
  getVersesByJuz, getSajdaVerses, getPage
} from '../controllers/surahController.mjs';
import {
  getAllReciters, getVerseTimings, getSingleVerseTiming, getAvailableSurahs,
  searchTimings, getAllAudioReciters
} from '../controllers/timingController.mjs';
import { handleError } from '../utils/errorUtils.mjs';

const router = express.Router();

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
// القراء الذين لديهم توقيتات فقط - 4 قراء
router.get('/timing/reciters', getAllReciters);
// السور المتاحة لقارئ توقيت
router.get('/timing/:reciter/surahs', getAvailableSurahs);
// توقيتات سورة كاملة لقارئ
router.get('/timing/:reciter/:surah_id', getVerseTimings);
// توقيت آية واحدة
router.get('/timing/:reciter/:surah_id/:verse_id', getSingleVerseTiming);
// البحث في التوقيتات
router.get('/timing/search', searchTimings);

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
    const jsonContent = JSON.parse(apiRef.json_content);
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
