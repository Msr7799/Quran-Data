import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');
const recitersPath = path.join(
    __dirname,
    '../data/json/reads_timing_data/ayat_timing_reads_hafs_114_only.json'
);
const timingsFolderPath = path.join(
    __dirname,
    '../data/json/reads_timing_data/timings_hafs_114'
);
const ayahAudioPath = path.join(__dirname, '../data/audio_verseByverse/ayahBayah.json');

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const extractPageNumber = (pageUrl) => {
    if (!pageUrl) return null;
    const match = String(pageUrl).match(/\/(\d{3})\.svg$/);
    return match ? Number(match[1]) : null;
};

const readJson = async (filePath) => {
    if (!(await fs.pathExists(filePath))) {
        throw new Error(`الملف غير موجود: ${filePath}`);
    }

    return fs.readJSON(filePath);
};

const createTables = async (db) => {
    await db.exec(`
        DROP TABLE IF EXISTS ayat_timing;
        DROP TABLE IF EXISTS ayat_timing_geometry;
        DROP TABLE IF EXISTS timing_reciters;
        DROP TABLE IF EXISTS ayah_audio_reciters;

        CREATE TABLE timing_reciters (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            rewaya TEXT,
            folder_url TEXT,
            soar_count INTEGER,
            soar_link TEXT
        );

        CREATE TABLE ayat_timing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reciter_id INTEGER NOT NULL,
            surah_number INTEGER NOT NULL,
            verse_number INTEGER NOT NULL,
            start_time_ms INTEGER NOT NULL,
            end_time_ms INTEGER NOT NULL,
            FOREIGN KEY (reciter_id) REFERENCES timing_reciters (id),
            FOREIGN KEY (surah_number) REFERENCES surahs (number),
            UNIQUE(reciter_id, surah_number, verse_number)
        );

        CREATE TABLE ayat_timing_geometry (
            surah_number INTEGER NOT NULL,
            verse_number INTEGER NOT NULL,
            polygon TEXT,
            x REAL,
            y REAL,
            page_number INTEGER,
            PRIMARY KEY (surah_number, verse_number)
        );

        CREATE INDEX idx_timing_reciter_id ON ayat_timing(reciter_id);
        CREATE INDEX idx_timing_surah ON ayat_timing(surah_number);
        CREATE INDEX idx_timing_verse ON ayat_timing(verse_number);
        CREATE INDEX idx_timing_reciter_surah ON ayat_timing(reciter_id, surah_number);

        CREATE TABLE ayah_audio_reciters (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            rewaya TEXT,
            musshaf_type TEXT,
            audio_url_bit_rate_32 TEXT,
            audio_url_bit_rate_64 TEXT,
            audio_url_bit_rate_128 TEXT
        );
    `);
};

const insertTimingReciters = async (db, reciters) => {
    const insert = await db.prepare(`
        INSERT INTO timing_reciters (
            id, name, rewaya, folder_url, soar_count, soar_link
        ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
        for (const reciter of reciters) {
            await insert.run(
                Number(reciter.id),
                reciter.name,
                reciter.rewaya || null,
                reciter.folder_url || null,
                Number(reciter.soar_count || 0),
                reciter.soar_link || null
            );
        }
    } finally {
        await insert.finalize();
    }
};

const insertAyahAudioReciters = async (db, ayahAudioData) => {
    const reciters = ayahAudioData.reciters_verse || [];
    const insert = await db.prepare(`
        INSERT INTO ayah_audio_reciters (
            id, name, rewaya, musshaf_type,
            audio_url_bit_rate_32, audio_url_bit_rate_64, audio_url_bit_rate_128
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        for (const reciter of reciters) {
            await insert.run(
                Number(reciter.id),
                reciter.name,
                reciter.rewaya || null,
                reciter.musshaf_type || null,
                reciter.audio_url_bit_rate_32_ || null,
                reciter.audio_url_bit_rate_64 || null,
                reciter.audio_url_bit_rate_128 || null
            );
        }
    } finally {
        await insert.finalize();
    }
};

const insertTimingRows = async (db, recitersById) => {
    const files = (await fs.readdir(timingsFolderPath))
        .filter((file) => /^timing_\d{3}\.json$/.test(file))
        .sort();

    const insert = await db.prepare(`
        INSERT INTO ayat_timing (
            reciter_id, surah_number, verse_number, start_time_ms, end_time_ms
        ) VALUES (?, ?, ?, ?, ?)
    `);
    const insertGeometry = await db.prepare(`
        INSERT INTO ayat_timing_geometry (
            surah_number, verse_number, polygon, x, y, page_number
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(surah_number, verse_number) DO NOTHING
    `);

    let rowsCount = 0;

    try {
        for (const file of files) {
            const timingFilePath = path.join(timingsFolderPath, file);
            const surahTiming = await fs.readJSON(timingFilePath);
            const surahNumber = Number(surahTiming.surah);

            for (const read of surahTiming.reads || []) {
                const reciter = recitersById.get(Number(read.read_id));

                if (!reciter) {
                    throw new Error(`القارئ ${read.read_id} غير موجود في ملف القراء: ${file}`);
                }

                for (const ayahTiming of read.ayat_timing || []) {
                    const startTimeMs = Number(ayahTiming.start_time);
                    const endTimeMs = Number(ayahTiming.end_time);

                    if (!Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) {
                        continue;
                    }

                    await insert.run(
                        Number(read.read_id),
                        surahNumber,
                        Number(ayahTiming.ayah),
                        startTimeMs,
                        endTimeMs
                    );

                    await insertGeometry.run(
                        surahNumber,
                        Number(ayahTiming.ayah),
                        ayahTiming.polygon || null,
                        toNumberOrNull(ayahTiming.x),
                        toNumberOrNull(ayahTiming.y),
                        extractPageNumber(ayahTiming.page)
                    );
                    rowsCount += 1;
                }
            }

            console.log(`تم استيراد ${file}`);
        }
    } finally {
        await insert.finalize();
        await insertGeometry.finalize();
    }

    return { filesCount: files.length, rowsCount };
};

const showStatistics = async (db) => {
    const timingReciters = await db.get('SELECT COUNT(*) AS count FROM timing_reciters');
    const timingRows = await db.get('SELECT COUNT(*) AS count FROM ayat_timing');
    const timingSurahs = await db.get('SELECT COUNT(DISTINCT surah_number) AS count FROM ayat_timing');
    const ayahAudioReciters = await db.get('SELECT COUNT(*) AS count FROM ayah_audio_reciters');

    console.log('\n--- إحصائيات قاعدة البيانات ---');
    console.log(`قراء التوقيت: ${timingReciters.count}`);
    console.log(`السور في التوقيتات: ${timingSurahs.count}`);
    console.log(`صفوف التوقيت: ${timingRows.count}`);
    console.log(`قراء الصوت آية-بآية: ${ayahAudioReciters.count}`);
};

export async function run() {
    console.log('بدء تحديث توقيتات حفص 114 سورة وبيانات الصوت آية-بآية...');
    console.log(`قاعدة البيانات: ${dbFilePath}`);
    console.log(`ملف قراء التوقيت: ${recitersPath}`);
    console.log(`مجلد توقيت السور: ${timingsFolderPath}`);
    console.log(`ملف قراء الآية آية: ${ayahAudioPath}`);

    const reciters = await readJson(recitersPath);
    const ayahAudioData = await readJson(ayahAudioPath);
    const recitersById = new Map(reciters.map((reciter) => [Number(reciter.id), reciter]));

    const db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });

    try {
        await db.exec('PRAGMA foreign_keys = OFF');
        await db.exec('BEGIN TRANSACTION');
        await createTables(db);
        await insertTimingReciters(db, reciters);
        await insertAyahAudioReciters(db, ayahAudioData);
        const timingStats = await insertTimingRows(db, recitersById);
        await db.exec('COMMIT');
        await db.exec('VACUUM');

        console.log(`\nتمت معالجة ${timingStats.filesCount} ملف سورة.`);
        console.log(`تم إدراج ${timingStats.rowsCount} صف توقيت.`);
        await showStatistics(db);
        console.log('\nتم تحديث قاعدة البيانات بنجاح.');
    } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
    } finally {
        await db.close();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    run().catch((error) => {
        console.error('فشل تحديث التوقيتات:', error);
        process.exit(1);
    });
}

export { run as addTimingToSqlite };
