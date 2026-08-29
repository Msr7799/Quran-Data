import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const dataRoot = path.join(root, 'data');
const dbPath = path.join(dataRoot, 'sqlite', 'database.sqlite');

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

export async function run() {
  const source = await readJson(path.join(dataRoot, 'mainDataQuran.json'));
  assert(Array.isArray(source) && source.length === 114, 'mainDataQuran.json != 114 surahs');
  const expectedVerses = source.reduce((sum, s) => sum + (s.verses?.length ?? 0), 0);
  const expectedAudio = source.reduce((sum, s) => sum + (s.audio?.length ?? 0), 0);
  const expectedReciters = new Set(source.flatMap((s) => (s.audio ?? []).map((a) => Number(a.id)))).size;

  const [surahFiles, verseFiles, audioFiles, metadata, csvText] = await Promise.all([
    readdir(path.join(dataRoot, 'json', 'surah')),
    readdir(path.join(dataRoot, 'json', 'verses')),
    readdir(path.join(dataRoot, 'json', 'audio')),
    readJson(path.join(dataRoot, 'json', 'metadata.json')),
    readFile(path.join(dataRoot, 'csv', 'database.csv'), 'utf8')
  ]);

  assert(surahFiles.filter((x) => /^surah_\d+\.json$/.test(x)).length === 114, 'surah JSON file count mismatch');
  assert(verseFiles.filter((x) => /^\d{3}_\d{3}\.json$/.test(x)).length === expectedVerses, 'verse JSON file count mismatch');
  assert(audioFiles.filter((x) => /^audio_surah_\d+\.json$/.test(x)).length === 114, 'audio JSON file count mismatch');
  assert(Array.isArray(metadata) && metadata.length === 114, 'metadata.json count mismatch');
  assert(csvText.split(/\r?\n/).filter(Boolean).length === 115, 'CSV row count must be 114 + header');

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const count = (table) => Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
    const hasTable = (table) => Boolean(db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=?").get(table));

    assert(count('surahs') === 114, 'SQLite surahs != 114');
    assert(count('verses') === expectedVerses, `SQLite verses != ${expectedVerses}`);
    assert(count('audio') === expectedAudio, `SQLite audio != ${expectedAudio}`);
    const reciters = Number(db.prepare('SELECT COUNT(DISTINCT id) AS count FROM audio').get().count);
    assert(reciters === expectedReciters, `SQLite reciters != ${expectedReciters}`);

    const report = {
      surahs: 114,
      verses: expectedVerses,
      audio: expectedAudio,
      reciters: expectedReciters,
      csvRows: 114
    };

    if (hasTable('timing_reciters')) {
      report.timingReciters = count('timing_reciters');
      report.timingRows = count('ayat_timing');
      report.ayahAudioReciters = count('ayah_audio_reciters');
      report.timingSurahs = Number(db.prepare('SELECT COUNT(DISTINCT surah_number) AS count FROM ayat_timing').get().count);
      assert(report.timingReciters === 96, `timing_reciters != 96 (${report.timingReciters})`);
      assert(report.timingRows === 600327, `ayat_timing != 600327 (${report.timingRows})`);
      assert(report.ayahAudioReciters === 38, `ayah_audio_reciters != 38 (${report.ayahAudioReciters})`);
      assert(report.timingSurahs === 114, `timing surahs != 114 (${report.timingSurahs})`);
    }

    if (hasTable('api_reference')) {
      report.apiReference = count('api_reference');
      assert(report.apiReference === 1, `api_reference != 1 (${report.apiReference})`);
    }

    if (hasTable('json_files')) report.jsonFiles = count('json_files');

    console.log('✅ DATA_PIPELINE_OK');
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error('❌ verifyDataPipeline failed:', error);
    process.exit(1);
  });
}
