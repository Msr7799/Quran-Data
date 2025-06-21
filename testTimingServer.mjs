import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// قاعدة البيانات
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

async function openDatabase() {
    return await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });
}

// Routes للتوقيت

// جلب جميع القراء
app.get('/api/timing/reciters', async (req, res) => {
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
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// جلب توقيت الفاتحة للسديس
app.get('/api/timing/:reciter/:surah_id', async (req, res) => {
    try {
        const { reciter, surah_id } = req.params;
        
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
            return res.status(404).json({
                success: false,
                message: `لم يتم العثور على توقيت للقارئ ${reciter} في السورة ${surah_id}`
            });
        }

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
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.json({
        message: 'Quran Timing API',
        endpoints: {
            'GET /api/timing/reciters': 'جلب جميع القراء المتاحين',
            'GET /api/timing/sudais/1': 'مثال: جلب توقيت الفاتحة للسديس',
            'GET /api/timing/Shuraym/1': 'مثال: جلب توقيت الفاتحة للشريم'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 Test: http://localhost:${PORT}/api/timing/sudais/1`);
    console.log(`👥 Reciters: http://localhost:${PORT}/api/timing/reciters`);
});
