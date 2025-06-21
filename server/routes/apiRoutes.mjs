import express from 'express';
import { getSurah, getAllSurahs, getAllVerses, getVerse, getAudio, getVersesByJuz, getSajdaVerses, getPage } from '../controllers/surahController.mjs';
import { getAllReciters, getVerseTimings, getSingleVerseTiming, getAvailableSurahs, searchTimings } from '../controllers/timingController.mjs';
import { handleError } from '../utils/errorUtils.mjs'
const router = express.Router();


router.get('/surahs', getAllSurahs);

router.get('/surah/:surah_id?', getSurah);

router.get('/verses/:surah_id?', getAllVerses);

router.get('/verse/:surah_id?/:verse_id?', getVerse);

router.get('/sajda', getSajdaVerses);

router.get('/audio/:surah_id?', getAudio);

router.get('/juz/:juz_id?', getVersesByJuz);

router.get('/pages/:surah_id?/:verse_id?', getPage);

// ============= Timing Routes =============
// جلب جميع القراء المتاحين
router.get('/timing/reciters', getAllReciters);

// جلب السور المتاحة لقارئ معين
router.get('/timing/:reciter/surahs', getAvailableSurahs);

// جلب توقيت آيات سورة معينة لقارئ معين
router.get('/timing/:reciter/:surah_id', getVerseTimings);

// جلب توقيت آية واحدة محددة
router.get('/timing/:reciter/:surah_id/:verse_id', getSingleVerseTiming);

// البحث في التوقيتات
router.get('/timing/search', searchTimings);

router.use((req, res) => {
    handleError(res, 404, '404 - The requested resource was not found in /api/', {
        message: 'The requested URL was not found on this server.',
    });
});

export default router;
