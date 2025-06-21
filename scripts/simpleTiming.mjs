import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const timingFolderPath = path.join(__dirname, '../data/json/ayat_Timming');
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

console.log('بدء السكربت...');
console.log(`مسار ملفات التوقيت: ${timingFolderPath}`);
console.log(`مسار قاعدة البيانات: ${dbFilePath}`);

async function main() {
    try {
        // التحقق من وجود المجلد
        const folderExists = await fs.pathExists(timingFolderPath);
        console.log(`مجلد التوقيت موجود: ${folderExists}`);
        
        if (!folderExists) {
            throw new Error('مجلد التوقيت غير موجود');
        }
        
        // قراءة الملفات
        const files = await fs.readdir(timingFolderPath);
        console.log(`الملفات الموجودة: ${files.join(', ')}`);
        
        // فتح قاعدة البيانات
        console.log('فتح قاعدة البيانات...');
        const db = await open({
            filename: dbFilePath,
            driver: sqlite3.Database
        });
        console.log('✅ تم فتح قاعدة البيانات');
        
        // إنشاء جدول التوقيت
        console.log('إنشاء جدول التوقيت...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS ayat_timing (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reciter_name TEXT NOT NULL,
                reciter_display_name TEXT,
                surah_number INTEGER,
                verse_number INTEGER,
                timing_seconds REAL,
                UNIQUE(reciter_name, surah_number, verse_number)
            );
        `);
        console.log('✅ تم إنشاء جدول التوقيت');
        
        // معالجة الملفات
        for (const file of files) {
            if (file.endsWith('.json')) {
                console.log(`معالجة ملف: ${file}`);
                const filePath = path.join(timingFolderPath, file);
                const data = await fs.readJSON(filePath);
                const reciterName = file.replace('.json', '');
                
                console.log(`  - اسم القارئ: ${reciterName}`);
                console.log(`  - الاسم المعروض: ${data.name}`);
                
                // حذف البيانات السابقة
                await db.run('DELETE FROM ayat_timing WHERE reciter_name = ?', [reciterName]);
                
                let insertCount = 0;
                for (const [surahKey, verses] of Object.entries(data)) {
                    if (surahKey === 'name') continue;
                    
                    const surahNumber = parseInt(surahKey);
                    
                    for (const [verseKey, timingSeconds] of Object.entries(verses)) {
                        const verseNumber = parseInt(verseKey);
                        
                        if (!isNaN(surahNumber) && !isNaN(verseNumber) && !isNaN(timingSeconds)) {
                            await db.run(`
                                INSERT OR REPLACE INTO ayat_timing (
                                    reciter_name, reciter_display_name, 
                                    surah_number, verse_number, timing_seconds
                                ) VALUES (?, ?, ?, ?, ?)
                            `, [reciterName, data.name, surahNumber, verseNumber, timingSeconds]);
                            insertCount++;
                        }
                    }
                }
                console.log(`  - تم إدراج ${insertCount} سجل`);
            }
        }
        
        // عرض النتائج
        const count = await db.get('SELECT COUNT(*) as count FROM ayat_timing');
        console.log(`\n✅ إجمالي السجلات المدرجة: ${count.count}`);
        
        const reciters = await db.all('SELECT DISTINCT reciter_name, reciter_display_name FROM ayat_timing');
        console.log('\nالقراء المدرجون:');
        reciters.forEach(r => {
            console.log(`- ${r.reciter_display_name || r.reciter_name}`);
        });
        
        await db.close();
        console.log('\n🎉 تم الانتهاء بنجاح!');
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

main();
