/**
 * سكربت إدخال ملفات JSON إلى قاعدة البيانات SQLite
 * يقوم بإنشاء جدول json_files وإدخال ملفات JSON من مجلد data/json
 * 
 * الاستخدام:
 * node scripts/addJsonToSqlite.mjs
 * node scripts/addJsonToSqlite.mjs --file=api_reference.json
 * node scripts/addJsonToSqlite.mjs --folder=audio
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسارات المجلدات
const dbPath = path.join(__dirname, '..', 'data', 'sqlite', 'database.sqlite');
const jsonBasePath = path.join(__dirname, '..', 'data', 'json');

/**
 * إنشاء جدول json_files في قاعدة البيانات
 */
async function createJsonTable(db) {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS json_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL UNIQUE,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL DEFAULT 'json',
            json_content TEXT NOT NULL,
            content_size INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            description TEXT,
            version TEXT DEFAULT '1.0.0',
            is_active BOOLEAN DEFAULT 1,
            tags TEXT
        );
    `;

    await db.exec(createTableSQL);
    console.log('✅ تم إنشاء جدول json_files بنجاح');

    // إنشاء فهارس للبحث السريع
    const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_json_files_name ON json_files(file_name);
        CREATE INDEX IF NOT EXISTS idx_json_files_type ON json_files(file_type);
        CREATE INDEX IF NOT EXISTS idx_json_files_created ON json_files(created_at);
    `;
    await db.exec(indexSQL);
    console.log('✅ تم إنشاء الفهارس بنجاح');
}

/**
 * قراءة محتوى ملف JSON وإرجاع المعلومات
 */
async function readJsonFile(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        const stats = await fs.stat(filePath);
        
        return {
            content: fileContent,
            parsed: jsonData,
            size: stats.size,
            lastModified: stats.mtime
        };
    } catch (error) {
        console.error(`❌ خطأ في قراءة الملف ${filePath}:`, error.message);
        return null;
    }
}

/**
 * استخراج معلومات وصفية من محتوى JSON
 */
function extractMetadata(jsonData, fileName) {
    let description = '';
    let version = '1.0.0';
    let tags = '';

    try {
        // استخراج الوصف
        if (jsonData.api_info?.description) {
            description = jsonData.api_info.description;
        } else if (jsonData.description) {
            description = jsonData.description;
        } else if (jsonData.metadata?.description) {
            description = jsonData.metadata.description;
        }

        // استخراج الإصدار
        if (jsonData.api_info?.version) {
            version = jsonData.api_info.version;
        } else if (jsonData.version) {
            version = jsonData.version;
        } else if (jsonData.metadata?.version) {
            version = jsonData.metadata.version;
        }

        // استخراج العلامات
        const tagsArray = [];
        if (fileName.includes('api')) tagsArray.push('api');
        if (fileName.includes('reference')) tagsArray.push('reference');
        if (fileName.includes('metadata')) tagsArray.push('metadata');
        if (fileName.includes('audio')) tagsArray.push('audio');
        if (fileName.includes('surah')) tagsArray.push('surah');
        if (fileName.includes('verse')) tagsArray.push('verse');
        
        tags = tagsArray.join(',');

    } catch (error) {
        console.warn(`⚠️ تحذير: لا يمكن استخراج الميتاداتا من ${fileName}`);
    }

    return { description, version, tags };
}

/**
 * إدخال ملف JSON إلى قاعدة البيانات
 */
async function insertJsonFile(db, filePath, relativePath) {
    const fileName = path.basename(filePath);
    console.log(`📁 معالجة الملف: ${fileName}`);

    const fileData = await readJsonFile(filePath);
    if (!fileData) {
        return false;
    }

    const metadata = extractMetadata(fileData.parsed, fileName);

    try {
        // التحقق من وجود الملف
        const existingFile = await db.get(
            'SELECT id FROM json_files WHERE file_name = ?',
            [fileName]
        );

        if (existingFile) {
            // تحديث الملف الموجود
            await db.run(`
                UPDATE json_files 
                SET json_content = ?, 
                    content_size = ?, 
                    updated_at = CURRENT_TIMESTAMP,
                    description = ?,
                    version = ?,
                    tags = ?
                WHERE file_name = ?
            `, [
                fileData.content,
                fileData.size,
                metadata.description,
                metadata.version,
                metadata.tags,
                fileName
            ]);
            console.log(`🔄 تم تحديث الملف: ${fileName}`);
        } else {
            // إدخال ملف جديد
            await db.run(`
                INSERT INTO json_files (
                    file_name, file_path, json_content, content_size,
                    description, version, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                fileName,
                relativePath,
                fileData.content,
                fileData.size,
                metadata.description,
                metadata.version,
                metadata.tags
            ]);
            console.log(`✅ تم إدخال الملف: ${fileName}`);
        }

        return true;
    } catch (error) {
        console.error(`❌ خطأ في إدخال الملف ${fileName}:`, error.message);
        return false;
    }
}

/**
 * البحث عن جميع ملفات JSON في مجلد
 */
async function findJsonFiles(dirPath, basePath = '') {
    const files = [];
    
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            const relativePath = path.join(basePath, item.name);
            
            if (item.isDirectory()) {
                // البحث في المجلدات الفرعية
                const subFiles = await findJsonFiles(fullPath, relativePath);
                files.push(...subFiles);
            } else if (item.isFile() && item.name.endsWith('.json')) {
                files.push({
                    fullPath: fullPath,
                    relativePath: relativePath.replace(/\\/g, '/'), // توحيد مسار النظام
                    name: item.name
                });
            }
        }
    } catch (error) {
        console.error(`❌ خطأ في قراءة المجلد ${dirPath}:`, error.message);
    }
    
    return files;
}

/**
 * عرض إحصائيات البيانات المدخلة
 */
async function showStatistics(db) {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_files,
                SUM(content_size) as total_size,
                COUNT(DISTINCT file_path) as unique_paths,
                AVG(content_size) as avg_size
            FROM json_files
        `);

        const recentFiles = await db.all(`
            SELECT file_name, created_at, content_size 
            FROM json_files 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('\n📊 إحصائيات قاعدة البيانات:');
        console.log(`📁 إجمالي الملفات: ${stats.total_files}`);
        console.log(`💾 إجمالي الحجم: ${(stats.total_size / 1024).toFixed(2)} KB`);
        console.log(`📂 المسارات الفريدة: ${stats.unique_paths}`);
        console.log(`📏 متوسط حجم الملف: ${(stats.avg_size / 1024).toFixed(2)} KB`);

        if (recentFiles.length > 0) {
            console.log('\n📋 آخر الملفات المضافة:');
            recentFiles.forEach(file => {
                const date = new Date(file.created_at).toLocaleString('ar');
                const size = (file.content_size / 1024).toFixed(2);
                console.log(`  • ${file.file_name} (${size} KB) - ${date}`);
            });
        }
    } catch (error) {
        console.error('❌ خطأ في عرض الإحصائيات:', error.message);
    }
}

/**
 * معالجة المعاملات من سطر الأوامر
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        specificFile: null,
        specificFolder: null,
        showHelp: false
    };

    args.forEach(arg => {
        if (arg.startsWith('--file=')) {
            options.specificFile = arg.split('=')[1];
        } else if (arg.startsWith('--folder=')) {
            options.specificFolder = arg.split('=')[1];
        } else if (arg === '--help' || arg === '-h') {
            options.showHelp = true;
        }
    });

    return options;
}

/**
 * عرض مساعدة الاستخدام
 */
function showHelp() {
    console.log(`
🔧 سكربت إدخال ملفات JSON إلى قاعدة البيانات SQLite

📖 الاستخدام:
  node scripts/addJsonToSqlite.mjs                    # معالجة جميع ملفات JSON
  node scripts/addJsonToSqlite.mjs --file=api_reference.json  # ملف محدد
  node scripts/addJsonToSqlite.mjs --folder=audio    # مجلد محدد
  node scripts/addJsonToSqlite.mjs --help            # عرض هذه المساعدة

📁 المجلدات المدعومة:
  • data/json/                 # الملفات الرئيسية
  • data/json/audio/           # ملفات الصوت
  • data/json/ayat_Timming/    # ملفات التوقيت
  • data/json/surah/           # ملفات السور
  • data/json/verses/          # ملفات الآيات

💡 الميزات:
  ✅ إنشاء جدول json_files تلقائياً
  ✅ البحث المتكرر في المجلدات الفرعية
  ✅ استخراج الميتاداتا تلقائياً
  ✅ تحديث الملفات الموجودة
  ✅ عرض إحصائيات مفصلة
`);
}

/**
 * الدالة الرئيسية
 */
async function main() {
    const options = parseArguments();

    if (options.showHelp) {
        showHelp();
        return;
    }

    console.log('🚀 بدء سكربت إدخال ملفات JSON إلى SQLite...\n');

    try {
        // الاتصال بقاعدة البيانات
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

        // إنشاء الجدول
        await createJsonTable(db);

        let processedFiles = 0;
        let successfulFiles = 0;

        if (options.specificFile) {
            // معالجة ملف محدد
            const filePath = path.join(jsonBasePath, options.specificFile);
            const relativePath = `json/${options.specificFile}`;
            
            try {
                await fs.access(filePath);
                processedFiles = 1;
                const success = await insertJsonFile(db, filePath, relativePath);
                if (success) successfulFiles = 1;
            } catch (error) {
                console.error(`❌ الملف غير موجود: ${options.specificFile}`);
            }

        } else if (options.specificFolder) {
            // معالجة مجلد محدد
            const folderPath = path.join(jsonBasePath, options.specificFolder);
            const files = await findJsonFiles(folderPath, `json/${options.specificFolder}`);
            
            processedFiles = files.length;
            console.log(`📁 تم العثور على ${files.length} ملف JSON في المجلد: ${options.specificFolder}\n`);

            for (const file of files) {
                const success = await insertJsonFile(db, file.fullPath, file.relativePath);
                if (success) successfulFiles++;
            }

        } else {
            // معالجة جميع الملفات
            const allFiles = await findJsonFiles(jsonBasePath, 'json');
            processedFiles = allFiles.length;
            console.log(`📁 تم العثور على ${allFiles.length} ملف JSON إجمالاً\n`);

            for (const file of allFiles) {
                const success = await insertJsonFile(db, file.fullPath, file.relativePath);
                if (success) successfulFiles++;
            }
        }

        // عرض النتائج النهائية
        console.log('\n🎉 انتهت العملية بنجاح!');
        console.log(`📊 النتائج: ${successfulFiles}/${processedFiles} ملف تم إدخاله بنجاح`);

        // عرض الإحصائيات
        await showStatistics(db);

        await db.close();
        console.log('\n✅ تم إغلاق الاتصال بقاعدة البيانات');

    } catch (error) {
        console.error('❌ خطأ في تنفيذ السكربت:', error.message);
        process.exit(1);
    }
}

// تشغيل السكربت
main().catch(console.error);
