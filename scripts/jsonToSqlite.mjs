import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const jsonFilePath = path.join(root, 'data', 'mainDataQuran.json');
const dbFilePath = path.join(root, 'data', 'sqlite', 'database.sqlite');

function validateQuranData(data) {
  if (!Array.isArray(data) || data.length !== 114) {
    throw new Error(`mainDataQuran.json يجب أن يحتوي 114 سورة، الموجود: ${Array.isArray(data) ? data.length : 'غير صالح'}`);
  }
  return data;
}

function createBaseTables(db) {
  // Rebuild only the three base tables so an old v3.0 audio schema cannot survive.
  // Timing/API/json_files tables are preserved and can be refreshed by their own scripts.
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS audio;
    DROP TABLE IF EXISTS verses;
    DROP TABLE IF EXISTS surahs;

    CREATE TABLE surahs (
      number INTEGER PRIMARY KEY,
      name_ar TEXT,
      name_en TEXT,
      name_transliteration TEXT,
      revelation_place_ar TEXT,
      revelation_place_en TEXT,
      verses_count INTEGER,
      words_count INTEGER,
      letters_count INTEGER
    );

    CREATE TABLE verses (
      surah_number INTEGER NOT NULL,
      number INTEGER NOT NULL,
      text_ar TEXT,
      text_en TEXT,
      juz INTEGER,
      page INTEGER,
      sajda INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (surah_number, number),
      FOREIGN KEY (surah_number) REFERENCES surahs(number)
    );

    CREATE TABLE audio (
      id INTEGER NOT NULL,
      surah_number INTEGER NOT NULL,
      reciter_ar TEXT,
      reciter_en TEXT,
      rewaya_ar TEXT,
      rewaya_en TEXT,
      server TEXT,
      link TEXT,
      PRIMARY KEY (id, surah_number),
      FOREIGN KEY (surah_number) REFERENCES surahs(number)
    );

    CREATE INDEX idx_audio_surah ON audio(surah_number);
    CREATE INDEX idx_audio_reciter ON audio(id);
    CREATE INDEX idx_audio_reciter_name_ar ON audio(reciter_ar);
    CREATE INDEX idx_verses_juz ON verses(juz);
    CREATE INDEX idx_verses_page ON verses(page);
  `);
}

export async function run() {
  await mkdir(path.dirname(dbFilePath), { recursive: true });
  const data = validateQuranData(JSON.parse(await readFile(jsonFilePath, 'utf8')));
  const db = new DatabaseSync(dbFilePath);

  try {
    createBaseTables(db);
    const insertSurah = db.prepare(`
      INSERT INTO surahs (
        number, name_ar, name_en, name_transliteration,
        revelation_place_ar, revelation_place_en,
        verses_count, words_count, letters_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertVerse = db.prepare(`
      INSERT INTO verses (
        surah_number, number, text_ar, text_en, juz, page, sajda
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAudio = db.prepare(`
      INSERT INTO audio (
        id, surah_number, reciter_ar, reciter_en,
        rewaya_ar, rewaya_en, server, link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let verseRows = 0;
    let audioRows = 0;
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      for (const surah of data) {
        insertSurah.run(
          Number(surah.number),
          surah.name?.ar ?? null,
          surah.name?.en ?? null,
          surah.name?.transliteration ?? null,
          surah.revelation_place?.ar ?? null,
          surah.revelation_place?.en ?? null,
          Number(surah.verses_count ?? surah.verses?.length ?? 0),
          Number(surah.words_count ?? 0),
          Number(surah.letters_count ?? 0)
        );

        for (const verse of surah.verses ?? []) {
          insertVerse.run(
            Number(surah.number),
            Number(verse.number),
            verse.text?.ar ?? null,
            verse.text?.en ?? null,
            Number(verse.juz ?? 0),
            Number(verse.page ?? 0),
            verse.sajda ? 1 : 0
          );
          verseRows += 1;
        }

        for (const audio of surah.audio ?? []) {
          insertAudio.run(
            Number(audio.id),
            Number(surah.number),
            audio.reciter?.ar ?? null,
            audio.reciter?.en ?? null,
            audio.rewaya?.ar ?? null,
            audio.rewaya?.en ?? null,
            audio.server ?? null,
            audio.link ?? null
          );
          audioRows += 1;
        }
      }
      db.exec('COMMIT;');
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }

    db.exec('PRAGMA foreign_keys = ON;');
    const surahCount = db.prepare('SELECT COUNT(*) AS count FROM surahs').get().count;
    const verseCount = db.prepare('SELECT COUNT(*) AS count FROM verses').get().count;
    const audioCount = db.prepare('SELECT COUNT(*) AS count FROM audio').get().count;
    const reciterCount = db.prepare('SELECT COUNT(DISTINCT id) AS count FROM audio').get().count;

    if (Number(surahCount) !== 114 || Number(verseCount) !== verseRows || Number(audioCount) !== audioRows) {
      throw new Error(`فشل التحقق: surahs=${surahCount}, verses=${verseCount}/${verseRows}, audio=${audioCount}/${audioRows}`);
    }

    console.log(`✅ SQLite base rebuilt: ${surahCount} surahs, ${verseCount} verses, ${audioCount} audio rows, ${reciterCount} reciter IDs.`);
    return { surahs: Number(surahCount), verses: Number(verseCount), audio: Number(audioCount), reciters: Number(reciterCount) };
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error('❌ jsonToSqlite failed:', error);
    process.exit(1);
  });
}
