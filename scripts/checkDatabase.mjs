import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

const checkDatabase = async () => {
    try {
        const db = await open({
            filename: dbFilePath,
            driver: sqlite3.Database
        });

        // عرض الجداول المتاحة
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('الجداول المتاحة:', tables.map(t => t.name));

        // التحقق من وجود جدول التوقيت
        const timingTableExists = tables.some(t => t.name === 'ayat_timing');
        
        if (timingTableExists) {
            console.log('\n✅ جدول التوقيت موجود');
            
            // عدد سجلات التوقيت
            const count = await db.get('SELECT COUNT(*) as count FROM ayat_timing');
            console.log(`عدد سجلات التوقيت: ${count.count}`);
            
            // القراء المتاحون
            const reciters = await db.all('SELECT DISTINCT reciter_name, reciter_display_name FROM ayat_timing');
            console.log('\nالقراء المتاحون:');
            reciters.forEach(r => {
                console.log(`- ${r.reciter_display_name || r.reciter_name}`);
            });
            
            // عينة من البيانات
            const sample = await db.all('SELECT * FROM ayat_timing LIMIT 5');
            console.log('\nعينة من البيانات:');
            sample.forEach(row => {
                console.log(`القارئ: ${row.reciter_name}, السورة: ${row.surah_number}, الآية: ${row.verse_number}, التوقيت: ${row.timing_seconds}s`);
            });
            
        } else {
            console.log('❌ جدول التوقيت غير موجود');
        }

        await db.close();
    } catch (error) {
        console.error('خطأ في التحقق من قاعدة البيانات:', error);
    }
};

checkDatabase();
