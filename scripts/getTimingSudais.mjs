import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

async function getTimingForSudais() {
    try {
        // فتح قاعدة البيانات
        const db = await open({
            filename: dbFilePath,
            driver: sqlite3.Database
        });

        console.log('🔍 جلب توقيت آيات الفاتحة للسديس...\n');

        // جلب توقيت آيات الفاتحة للسديس
        const timings = await db.all(`
            SELECT 
                verse_number,
                timing_seconds,
                reciter_display_name
            FROM ayat_timing 
            WHERE reciter_name = 'sudais' 
            AND surah_number = 1 
            ORDER BY verse_number
        `);

        if (timings.length === 0) {
            console.log('❌ لم يتم العثور على توقيت للسديس في سورة الفاتحة');
            
            // البحث عن القراء المتاحين
            const availableReciters = await db.all(`
                SELECT DISTINCT reciter_name, reciter_display_name 
                FROM ayat_timing 
                WHERE surah_number = 1
            `);
            
            console.log('\nالقراء المتاحون لسورة الفاتحة:');
            availableReciters.forEach(r => {
                console.log(`- ${r.reciter_name} (${r.reciter_display_name})`);
            });
        } else {
            console.log(`✅ تم العثور على ${timings.length} آية للسديس في الفاتحة\n`);
            console.log('📖 توقيت آيات الفاتحة للسديس:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            timings.forEach(timing => {
                const minutes = Math.floor(timing.timing_seconds / 60);
                const seconds = (timing.timing_seconds % 60).toFixed(3);
                console.log(`الآية ${timing.verse_number}: ${timing.timing_seconds}s (${minutes}:${seconds.padStart(6, '0')})`);
            });
            
            // حساب المدة الإجمالية
            const totalSeconds = timings[timings.length - 1].timing_seconds;
            const totalMinutes = Math.floor(totalSeconds / 60);
            const remainingSeconds = (totalSeconds % 60).toFixed(3);
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📊 المدة الإجمالية: ${totalSeconds}s (${totalMinutes}:${remainingSeconds.padStart(6, '0')})`);
            console.log(`🎤 القارئ: ${timings[0].reciter_display_name}`);
        }

        await db.close();
        
    } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
    }
}

// تشغيل الدالة
getTimingForSudais();
