import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleError } from '../utils/errorUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../../data/sqlite/database.sqlite');

// فتح اتصال قاعدة البيانات
async function openDatabase() {
    return await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });
}

/**
 * جلب جميع القراء المتاحين
 * GET /api/timing/reciters
 */
export const getAllReciters = async (req, res) => {
    try {
        const db = await openDatabase();
        
        const reciters = await db.all(`
            SELECT DISTINCT 
                reciter_name,
                reciter_display_name,
                COUNT(*) as verses_count
            FROM ayat_timing 
            GROUP BY reciter_name, reciter_display_name
            ORDER BY reciter_name
        `);

        await db.close();

        res.json({
            success: true,
            data: reciters,
            count: reciters.length
        });

    } catch (error) {
        console.error('Error fetching reciters:', error);
        handleError(res, 500, 'خطأ في جلب قائمة القراء', { error: error.message });
    }
};

/**
 * جلب توقيت آيات سورة معينة لقارئ معين
 * GET /api/timing/:reciter/:surah_id
 */
export const getVerseTimings = async (req, res) => {
    try {
        const { reciter, surah_id } = req.params;
        
        if (!reciter || !surah_id) {
            return handleError(res, 400, 'اسم القارئ ورقم السورة مطلوبان', {
                example: '/api/timing/sudais/1'
            });
        }

        const db = await openDatabase();
        
        const timings = await db.all(`
            SELECT 
                verse_number,
                timing_seconds,
                reciter_display_name
            FROM ayat_timing 
            WHERE reciter_name = ? AND surah_number = ?
            ORDER BY verse_number
        `, [reciter, parseInt(surah_id)]);

        await db.close();

        if (timings.length === 0) {
            return handleError(res, 404, `لم يتم العثور على توقيت للقارئ ${reciter} في السورة ${surah_id}`, {
                available_reciters_endpoint: '/api/timing/reciters'
            });
        }

        // حساب المدة الإجمالية
        const totalDuration = timings[timings.length - 1].timing_seconds;

        res.json({
            success: true,
            data: {
                reciter: timings[0].reciter_display_name,
                reciter_key: reciter,
                surah_number: parseInt(surah_id),
                verses_count: timings.length,
                total_duration_seconds: totalDuration,
                verses: timings
            }
        });

    } catch (error) {
        console.error('Error fetching verse timings:', error);
        handleError(res, 500, 'خطأ في جلب توقيت الآيات', { error: error.message });
    }
};

/**
 * جلب توقيت آية واحدة محددة
 * GET /api/timing/:reciter/:surah_id/:verse_id
 */
export const getSingleVerseTiming = async (req, res) => {
    try {
        const { reciter, surah_id, verse_id } = req.params;
        
        if (!reciter || !surah_id || !verse_id) {
            return handleError(res, 400, 'اسم القارئ ورقم السورة ورقم الآية مطلوبان', {
                example: '/api/timing/sudais/1/1'
            });
        }

        const db = await openDatabase();
        
        const timing = await db.get(`
            SELECT 
                verse_number,
                timing_seconds,
                reciter_display_name,
                surah_number
            FROM ayat_timing 
            WHERE reciter_name = ? AND surah_number = ? AND verse_number = ?
        `, [reciter, parseInt(surah_id), parseInt(verse_id)]);

        await db.close();

        if (!timing) {
            return handleError(res, 404, `لم يتم العثور على توقيت للقارئ ${reciter} في السورة ${surah_id} الآية ${verse_id}`);
        }

        res.json({
            success: true,
            data: timing
        });

    } catch (error) {
        console.error('Error fetching single verse timing:', error);
        handleError(res, 500, 'خطأ في جلب توقيت الآية', { error: error.message });
    }
};

/**
 * جلب جميع السور المتاحة لقارئ معين
 * GET /api/timing/:reciter/surahs
 */
export const getAvailableSurahs = async (req, res) => {
    try {
        const { reciter } = req.params;
        
        if (!reciter) {
            return handleError(res, 400, 'اسم القارئ مطلوب', {
                example: '/api/timing/sudais/surahs'
            });
        }

        const db = await openDatabase();
        
        const surahs = await db.all(`
            SELECT 
                surah_number,
                COUNT(*) as verses_count,
                MAX(timing_seconds) as total_duration_seconds
            FROM ayat_timing 
            WHERE reciter_name = ?
            GROUP BY surah_number
            ORDER BY surah_number
        `, [reciter]);

        await db.close();

        if (surahs.length === 0) {
            return handleError(res, 404, `لم يتم العثور على سور للقارئ ${reciter}`, {
                available_reciters_endpoint: '/api/timing/reciters'
            });
        }

        res.json({
            success: true,
            data: {
                reciter: reciter,
                surahs_count: surahs.length,
                surahs: surahs
            }
        });

    } catch (error) {
        console.error('Error fetching available surahs:', error);
        handleError(res, 500, 'خطأ في جلب السور المتاحة', { error: error.message });
    }
};

/**
 * البحث عن توقيت بمعايير مختلفة
 * GET /api/timing/search?reciter=...&surah=...&verse=...
 */
export const searchTimings = async (req, res) => {
    try {
        const { reciter, surah, verse, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM ayat_timing WHERE 1=1';
        const params = [];
        
        if (reciter) {
            query += ' AND reciter_name LIKE ?';
            params.push(`%${reciter}%`);
        }
        
        if (surah) {
            query += ' AND surah_number = ?';
            params.push(parseInt(surah));
        }
        
        if (verse) {
            query += ' AND verse_number = ?';
            params.push(parseInt(verse));
        }
        
        query += ' ORDER BY reciter_name, surah_number, verse_number LIMIT ?';
        params.push(parseInt(limit));

        const db = await openDatabase();
        const results = await db.all(query, params);
        await db.close();

        res.json({
            success: true,
            data: results,
            count: results.length,
            filters: { reciter, surah, verse, limit }
        });

    } catch (error) {
        console.error('Error searching timings:', error);
        handleError(res, 500, 'خطأ في البحث عن التوقيتات', { error: error.message });
    }
};
