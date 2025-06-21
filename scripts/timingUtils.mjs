import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

/**
 * جلب توقيت آيات سورة معينة لقارئ معين
 * @param {string} reciterName - اسم القارئ
 * @param {number} surahNumber - رقم السورة
 * @returns {Promise<Array>} - مصفوفة تحتوي على توقيت الآيات
 */
export async function getVerseTimings(reciterName, surahNumber) {
    const db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });

    try {
        const timings = await db.all(`
            SELECT 
                verse_number,
                timing_seconds,
                reciter_display_name
            FROM ayat_timing 
            WHERE reciter_name = ? 
            AND surah_number = ? 
            ORDER BY verse_number
        `, [reciterName, surahNumber]);

        return timings;
    } finally {
        await db.close();
    }
}

/**
 * جلب قائمة بجميع القراء المتاحين
 * @returns {Promise<Array>} - مصفوفة تحتوي على أسماء القراء
 */
export async function getAvailableReciters() {
    const db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });

    try {
        const reciters = await db.all(`
            SELECT DISTINCT reciter_name, reciter_display_name 
            FROM ayat_timing 
            ORDER BY reciter_name
        `);

        return reciters;
    } finally {
        await db.close();
    }
}

/**
 * جلب قائمة بجميع السور المتاحة لقارئ معين
 * @param {string} reciterName - اسم القارئ
 * @returns {Promise<Array>} - مصفوفة تحتوي على أرقام السور
 */
export async function getAvailableSurahs(reciterName) {
    const db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });

    try {
        const surahs = await db.all(`
            SELECT DISTINCT surah_number 
            FROM ayat_timing 
            WHERE reciter_name = ? 
            ORDER BY surah_number
        `, [reciterName]);

        return surahs.map(s => s.surah_number);
    } finally {
        await db.close();
    }
}

/**
 * عرض توقيت آيات سورة معينة بشكل مُنسق
 * @param {string} reciterName - اسم القارئ
 * @param {number} surahNumber - رقم السورة
 */
export async function displayVerseTimings(reciterName, surahNumber) {
    try {
        console.log(`🔍 جلب توقيت آيات السورة ${surahNumber} للقارئ ${reciterName}...\n`);

        const timings = await getVerseTimings(reciterName, surahNumber);

        if (timings.length === 0) {
            console.log(`❌ لم يتم العثور على توقيت للقارئ ${reciterName} في السورة ${surahNumber}`);
            
            // عرض القراء المتاحين
            const availableReciters = await getAvailableReciters();
            console.log('\n📋 القراء المتاحون:');
            availableReciters.forEach(r => {
                console.log(`- ${r.reciter_name} (${r.reciter_display_name})`);
            });
            
            return;
        }

        console.log(`✅ تم العثور على ${timings.length} آية\n`);
        console.log(`📖 توقيت آيات السورة ${surahNumber} للقارئ ${timings[0].reciter_display_name}:`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        timings.forEach(timing => {
            const minutes = Math.floor(timing.timing_seconds / 60);
            const seconds = (timing.timing_seconds % 60).toFixed(3);
            console.log(`الآية ${timing.verse_number.toString().padStart(3, ' ')}: ${timing.timing_seconds.toString().padStart(8, ' ')}s (${minutes}:${seconds.padStart(6, '0')})`);
        });
        
        // حساب المدة الإجمالية
        const totalSeconds = timings[timings.length - 1].timing_seconds;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = (totalSeconds % 60).toFixed(3);
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 المدة الإجمالية: ${totalSeconds}s (${totalMinutes}:${remainingSeconds.padStart(6, '0')})`);
        console.log(`📝 عدد الآيات: ${timings.length}`);
        
        return timings;
        
    } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
        throw error;
    }
}

// إذا تم تشغيل الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
    // أمثلة على الاستخدام
    
    // 1. توقيت الفاتحة للسديس
    console.log('='.repeat(60));
    console.log('🕌 مثال 1: توقيت الفاتحة للسديس');
    console.log('='.repeat(60));
    await displayVerseTimings('sudais', 1);
    
    console.log('\n\n');
    
    // 2. توقيت الفاتحة للشريم
    console.log('='.repeat(60));
    console.log('🕌 مثال 2: توقيت الفاتحة للشريم');
    console.log('='.repeat(60));
    await displayVerseTimings('Shuraym', 1);
    
    console.log('\n\n');
    
    // 3. عرض جميع القراء المتاحين
    console.log('='.repeat(60));
    console.log('📋 جميع القراء المتاحين');
    console.log('='.repeat(60));
    const reciters = await getAvailableReciters();
    reciters.forEach((r, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${r.reciter_name} - ${r.reciter_display_name}`);
    });
}
