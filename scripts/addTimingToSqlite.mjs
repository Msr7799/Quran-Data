import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const timingFolderPath = path.join(__dirname, '../data/json/ayat_Timming');
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

// قراءة جميع ملفات التوقيت
const readTimingFiles = async () => {
    try {
        const files = await fs.readdir(timingFolderPath);
        const timingData = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(timingFolderPath, file);
                const data = await fs.readJSON(filePath);
                const reciterName = file.replace('.json', '');
                
                timingData.push({
                    reciter: reciterName,
                    name: data.name || reciterName,
                    data: data
                });
            }
        }
        
        return timingData;
    } catch (error) {
        console.error('Error reading timing files:', error);
        throw error;
    }
};

// إضافة جدول التوقيت إلى قاعدة البيانات
const createTimingTable = async (db) => {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ayat_timing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reciter_name TEXT NOT NULL,
            reciter_display_name TEXT,
            surah_number INTEGER,
            verse_number INTEGER,
            timing_seconds REAL,
            FOREIGN KEY (surah_number) REFERENCES surahs (number),
            UNIQUE(reciter_name, surah_number, verse_number)
        );
        
        CREATE INDEX IF NOT EXISTS idx_timing_reciter ON ayat_timing(reciter_name);
        CREATE INDEX IF NOT EXISTS idx_timing_surah ON ayat_timing(surah_number);
        CREATE INDEX IF NOT EXISTS idx_timing_verse ON ayat_timing(verse_number);
    `);
};

// إدراج بيانات التوقيت
const insertTimingData = async (db, timingFiles) => {
    try {
        console.log('بدء إدراج بيانات التوقيت...');
        
        for (const timing of timingFiles) {
            const reciterName = timing.reciter;
            const displayName = timing.name;
            
            console.log(`معالجة بيانات القارئ: ${reciterName}`);
            
            // حذف البيانات السابقة للقارئ لتجنب التكرار
            await db.run('DELETE FROM ayat_timing WHERE reciter_name = ?', [reciterName]);
            
            // معالجة كل سورة
            for (const [surahKey, verses] of Object.entries(timing.data)) {
                // تجاهل خاصية "name"
                if (surahKey === 'name') continue;
                
                const surahNumber = parseInt(surahKey);
                
                // معالجة كل آية
                for (const [verseKey, timingSeconds] of Object.entries(verses)) {
                    const verseNumber = parseInt(verseKey);
                    
                    if (!isNaN(surahNumber) && !isNaN(verseNumber) && !isNaN(timingSeconds)) {
                        await db.run(`
                            INSERT INTO ayat_timing (
                                reciter_name, reciter_display_name, 
                                surah_number, verse_number, timing_seconds
                            ) VALUES (?, ?, ?, ?, ?)
                            ON CONFLICT(reciter_name, surah_number, verse_number) 
                            DO UPDATE SET 
                                reciter_display_name=excluded.reciter_display_name,
                                timing_seconds=excluded.timing_seconds
                        `, [reciterName, displayName, surahNumber, verseNumber, timingSeconds]);
                    }
                }
            }
        }
        
        console.log('تم إدراج بيانات التوقيت بنجاح');
    } catch (error) {
        console.error('خطأ في إدراج بيانات التوقيت:', error);
        throw error;
    }
};

// عرض إحصائيات البيانات المدرجة
const showStatistics = async (db) => {
    try {
        const reciters = await db.all('SELECT DISTINCT reciter_name, reciter_display_name FROM ayat_timing');
        console.log('\n--- إحصائيات بيانات التوقيت ---');
        console.log(`عدد القراء: ${reciters.length}`);
        
        for (const reciter of reciters) {
            const count = await db.get(
                'SELECT COUNT(*) as count FROM ayat_timing WHERE reciter_name = ?', 
                [reciter.reciter_name]
            );
            console.log(`- ${reciter.reciter_display_name || reciter.reciter_name}: ${count.count} توقيت`);
        }
        
        const totalCount = await db.get('SELECT COUNT(*) as total FROM ayat_timing');
        console.log(`\nإجمالي عدد التوقيتات: ${totalCount.total}`);
        
    } catch (error) {
        console.error('خطأ في عرض الإحصائيات:', error);
    }
};

// دوال مساعدة للاستعلام عن بيانات التوقيت

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
            
            const availableReciters = await getAvailableReciters();
            console.log('\n📋 القراء المتاحون:');
            availableReciters.forEach(r => {
                console.log(`- ${r.reciter_name} (${r.reciter_display_name})`);
            });
            
            return;
        }

        console.log(`✅ تم العثور على ${timings.length} آية\n`);
        console.log(`📖 توقيت آيات السورة ${surahNumber} للقارئ ${timings[0].reciter_display_name}:`);
        console.log('━'.repeat(50));
        
        timings.forEach(timing => {
            const minutes = Math.floor(timing.timing_seconds / 60);
            const seconds = (timing.timing_seconds % 60).toFixed(3);
            console.log(`الآية ${timing.verse_number}: ${timing.timing_seconds}s (${minutes}:${seconds.padStart(6, '0')})`);
        });
        
        const totalSeconds = timings[timings.length - 1].timing_seconds;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = (totalSeconds % 60).toFixed(3);
        
        console.log('━'.repeat(50));
        console.log(`📊 المدة الإجمالية: ${totalSeconds}s (${totalMinutes}:${remainingSeconds.padStart(6, '0')})`);
        
        return timings;
        
    } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
        throw error;
    }
}

// تنفيذ السكربت الرئيسي
const run = async () => {
    try {
        console.log('بدء معالجة ملفات التوقيت...');
        console.log(`مسار قاعدة البيانات: ${dbFilePath}`);
        console.log(`مسار ملفات التوقيت: ${timingFolderPath}`);
        
        // فتح قاعدة البيانات
        const db = await open({
            filename: dbFilePath,
            driver: sqlite3.Database
        });
        console.log('✅ تم فتح قاعدة البيانات بنجاح');
        
        // إنشاء جدول التوقيت
        await createTimingTable(db);
        console.log('✅ تم إنشاء جدول التوقيت');
        
        // قراءة ملفات التوقيت
        const timingFiles = await readTimingFiles();
        console.log(`تم العثور على ${timingFiles.length} ملف توقيت`);
        
        // إدراج البيانات
        await insertTimingData(db, timingFiles);
        
        // عرض الإحصائيات
        await showStatistics(db);
        
        // إغلاق قاعدة البيانات
        await db.close();
        
        console.log('\nتم الانتهاء من معالجة جميع ملفات التوقيت بنجاح! ✅');
        
    } catch (error) {
        console.error('خطأ أثناء معالجة البيانات:', error);
    }
};

// تشغيل السكربت إذا تم استدعاؤه مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('تشغيل السكربت...');
    run().catch(error => {
        console.error('خطأ في تشغيل السكربت:', error);
        process.exit(1);
    });
}

export { run as addTimingToSqlite };
