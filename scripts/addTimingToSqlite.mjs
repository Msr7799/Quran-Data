import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const dbFilePath = path.join(root, 'data', 'sqlite', 'database.sqlite');
const recitersPath = path.join(root, 'data', 'json', 'reads_timing_data', 'ayat_timing_reads_hafs_114_only.json');
const timingsFolderPath = path.join(root, 'data', 'json', 'reads_timing_data', 'timings_hafs_114');
const ayahAudioPath = path.join(root, 'data', 'audio_verseByverse', 'ayahBayah.json');

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const extractPageNumber = (pageUrl) => {
  const match = String(pageUrl ?? '').match(/\/(\d{3})\.svg$/);
  return match ? Number(match[1]) : null;
};

function createTables(db) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
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
      UNIQUE(reciter_id, surah_number, verse_number),
      FOREIGN KEY (reciter_id) REFERENCES timing_reciters(id),
      FOREIGN KEY (surah_number) REFERENCES surahs(number)
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
}

export async function run() {
  const [reciters, ayahAudioData, timingFiles] = await Promise.all([
    readJson(recitersPath),
    readJson(ayahAudioPath),
    readdir(timingsFolderPath)
  ]);

  if (!Array.isArray(reciters) || reciters.length === 0) throw new Error('ملف قراء التوقيت غير صالح.');
  const files = timingFiles.filter((name) => /^timing_\d{3}\.json$/.test(name)).sort();
  if (files.length !== 114) throw new Error(`يجب وجود 114 ملف توقيت، الموجود: ${files.length}`);

  const recitersById = new Map(reciters.map((item) => [Number(item.id), item]));
  const db = new DatabaseSync(dbFilePath);
  let timingRows = 0;
  let geometryRows = 0;
  let anomalyRows = 0;

  try {
    createTables(db);

    const insertReciter = db.prepare(`
      INSERT INTO timing_reciters (id, name, rewaya, folder_url, soar_count, soar_link)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertAyahAudioReciter = db.prepare(`
      INSERT INTO ayah_audio_reciters (
        id, name, rewaya, musshaf_type,
        audio_url_bit_rate_32, audio_url_bit_rate_64, audio_url_bit_rate_128
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTiming = db.prepare(`
      INSERT INTO ayat_timing (
        reciter_id, surah_number, verse_number, start_time_ms, end_time_ms
      ) VALUES (?, ?, ?, ?, ?)
    `);
    const insertGeometry = db.prepare(`
      INSERT INTO ayat_timing_geometry (
        surah_number, verse_number, polygon, x, y, page_number
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      for (const reciter of reciters) {
        insertReciter.run(
          Number(reciter.id), reciter.name, reciter.rewaya ?? null,
          reciter.folder_url ?? null, Number(reciter.soar_count ?? 0), reciter.soar_link ?? null
        );
      }

      for (const reciter of ayahAudioData.reciters_verse ?? []) {
        insertAyahAudioReciter.run(
          Number(reciter.id), reciter.name, reciter.rewaya ?? null, reciter.musshaf_type ?? null,
          reciter.audio_url_bit_rate_32_ ?? reciter.audio_url_bit_rate_32 ?? null,
          reciter.audio_url_bit_rate_64 ?? null,
          reciter.audio_url_bit_rate_128 ?? null
        );
      }

      const seenGeometry = new Set();
      for (const file of files) {
        const payload = await readJson(path.join(timingsFolderPath, file));
        const surahNumber = Number(payload.surah);
        if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
          throw new Error(`رقم سورة غير صالح في ${file}: ${payload.surah}`);
        }

        for (const read of payload.reads ?? []) {
          const reciterId = Number(read.read_id);
          if (!recitersById.has(reciterId)) throw new Error(`القارئ ${read.read_id} غير موجود (${file}).`);

          for (const item of read.ayat_timing ?? []) {
            const verseNumber = Number(item.ayah);
            const start = Number(item.start_time);
            const end = Number(item.end_time);
            if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
            if (end < start) anomalyRows += 1;

            insertTiming.run(reciterId, surahNumber, verseNumber, start, end);
            timingRows += 1;

            const geometryKey = `${surahNumber}:${verseNumber}`;
            if (!seenGeometry.has(geometryKey)) {
              insertGeometry.run(
                surahNumber,
                verseNumber,
                item.polygon ?? null,
                toNumberOrNull(item.x),
                toNumberOrNull(item.y),
                extractPageNumber(item.page)
              );
              seenGeometry.add(geometryKey);
              geometryRows += 1;
            }
          }
        }
      }

      db.exec(`
        CREATE INDEX idx_timing_reciter_id ON ayat_timing(reciter_id);
        CREATE INDEX idx_timing_surah ON ayat_timing(surah_number);
        CREATE INDEX idx_timing_verse ON ayat_timing(verse_number);
        CREATE INDEX idx_timing_reciter_surah ON ayat_timing(reciter_id, surah_number);
      `);
      db.exec('COMMIT;');
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }

    db.exec('PRAGMA foreign_keys = ON;');
    const dbTimingRows = Number(db.prepare('SELECT COUNT(*) AS count FROM ayat_timing').get().count);
    const dbGeometryRows = Number(db.prepare('SELECT COUNT(*) AS count FROM ayat_timing_geometry').get().count);
    const dbTimingReciters = Number(db.prepare('SELECT COUNT(*) AS count FROM timing_reciters').get().count);
    const dbAyahReciters = Number(db.prepare('SELECT COUNT(*) AS count FROM ayah_audio_reciters').get().count);
    const dbSurahs = Number(db.prepare('SELECT COUNT(DISTINCT surah_number) AS count FROM ayat_timing').get().count);

    if (dbTimingRows !== timingRows || dbTimingReciters !== reciters.length || dbSurahs !== 114) {
      throw new Error(`فشل التحقق من التوقيتات: rows=${dbTimingRows}/${timingRows}, reciters=${dbTimingReciters}/${reciters.length}, surahs=${dbSurahs}`);
    }

    console.log(`✅ Timing SQLite updated: ${dbTimingReciters} reciters, ${dbSurahs} surahs, ${dbTimingRows} timing rows, ${dbGeometryRows} geometry rows, ${dbAyahReciters} ayah-audio reciters.`);
    if (anomalyRows) console.warn(`⚠️ Source timing anomalies preserved as-is (end < start): ${anomalyRows}`);
    return {
      timingReciters: dbTimingReciters,
      surahs: dbSurahs,
      timingRows: dbTimingRows,
      geometryRows: dbGeometryRows,
      ayahAudioReciters: dbAyahReciters,
      anomalyRows
    };
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error('❌ addTimingToSqlite failed:', error);
    process.exit(1);
  });
}
