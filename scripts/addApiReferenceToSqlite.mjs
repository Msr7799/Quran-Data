import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiReferenceFilePath = path.join(__dirname, '../data/json/api_reference.json');
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

async function addApiReferenceToSqlite() {
    console.log('🔍 بدء عملية إدخال ملف API Reference إلى قاعدة البيانات SQLite...');
    
    try {
        // التحقق من وجود الملفات
        if (!await fs.pathExists(dbFilePath)) {
            console.error('❌ ملف قاعدة البيانات غير موجود:', dbFilePath);
            return;
        }
        
        if (!await fs.pathExists(apiReferenceFilePath)) {
            console.error('❌ ملف API Reference غير موجود:', apiReferenceFilePath);
            return;
        }

        // اتصال بقاعدة البيانات
        const db = await open({
            filename: dbFilePath,
            driver: sqlite3.Database
        });
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

        // إنشاء جدول api_reference إذا لم يكن موجوداً
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS api_reference (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                version TEXT,
                base_url TEXT,
                documentation_url TEXT,
                github_url TEXT,
                json_content TEXT NOT NULL,
                statistics TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await db.exec(createTableQuery);
        console.log('✅ تم إنشاء/التحقق من جدول api_reference');

        // قراءة ملف api_reference.json
        console.log('📖 جاري قراءة ملف api_reference.json...');
        const apiReferenceData = await fs.readJSON(apiReferenceFilePath);

        // حذف البيانات السابقة (إذا وجدت)
        const deleteResult = await db.run('DELETE FROM api_reference');
        console.log(`🗑️ تم حذف ${deleteResult.changes || 0} سجل سابق`);

        // إدخال البيانات الجديدة
        const insertQuery = `
            INSERT INTO api_reference (
                title, description, version, base_url, 
                documentation_url, github_url, json_content, statistics
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.run(
            insertQuery,
            apiReferenceData.api_info.title,
            apiReferenceData.api_info.description,
            apiReferenceData.api_info.version,
            apiReferenceData.api_info.base_url,
            apiReferenceData.api_info.documentation_url,
            apiReferenceData.api_info.github_url,
            JSON.stringify(apiReferenceData, null, 2),
            JSON.stringify(apiReferenceData.statistics, null, 2)
        );

        console.log(`✅ تم إدخال البيانات بنجاح! ID: ${result.lastID}`);

        // التحقق من البيانات المدخلة
        const verifyResult = await db.all('SELECT id, title, version, created_at FROM api_reference');
        
        console.log('\n📊 البيانات المدخلة:');
        verifyResult.forEach(row => {
            console.log(`   - ID: ${row.id}`);
            console.log(`   - العنوان: ${row.title}`);
            console.log(`   - الإصدار: ${row.version}`);
            console.log(`   - تاريخ الإنشاء: ${row.created_at}`);
        });

        // عرض إحصائيات الجدول
        const countResult = await db.get('SELECT COUNT(*) as total FROM api_reference');
        console.log(`\n📈 إجمالي السجلات في جدول api_reference: ${countResult.total}`);

        // إحصائيات إضافية من المحتوى
        console.log('\n📋 إحصائيات API Reference:');
        console.log(`   - إجمالي السور: ${apiReferenceData.statistics.total_surahs}`);
        console.log(`   - إجمالي الآيات: ${apiReferenceData.statistics.total_verses}`);
        console.log(`   - القراء الصوتيين: ${apiReferenceData.statistics.total_audio_reciters}`);
        console.log(`   - قراء التوقيت: ${apiReferenceData.statistics.timing_reciters}`);
        console.log(`   - إجمالي توقيتات الآيات: ${apiReferenceData.statistics.total_verse_timings}`);

        await db.close();
        console.log('\n🎉 تمت العملية بنجاح! تم إغلاق الاتصال بقاعدة البيانات');

    } catch (error) {
        console.error('❌ خطأ أثناء العملية:', error.message);
        console.error('تفاصيل الخطأ:', error);
    }
}

// تشغيل الدالة
addApiReferenceToSqlite();
