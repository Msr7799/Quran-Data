import fs from 'node:fs';
import {
  loadReciterCatalogWithImages,
  listAyahBayahReciters,
  resolveAyahBayahReciter,
  clearReciterDataCaches,
  dataRootPath
} from '../server/services/reciterDataService.mjs';

const expectedFolders = [
  'surah-recitation-abdul-rahman-al-sudais',
  'surah-recitation-abdullah-awad-al-juhani',
  'surah-recitation-ali-abdur-rahman-al-huthaify',
  'surah-recitation-bandar-baleela',
  'surah-recitation-maher-al-muaiqly',
  'surah-recitation-mishari-al-afasy',
  'surah-recitation-yasser-al-dosari',
  'ayah-recitation-muhammad-siddiq-al-minshawi-murattal-hafs-959.json',
  'ayah-recitation-saud-al-shuraim-murattal-hafs-960.json'
];

const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
};

console.log(`📁 Data root: ${dataRootPath}`);
if (!fs.existsSync(dataRootPath)) {
  fail('مجلد data غير موجود في هذه النسخة. انسخ مجلد data الكامل ثم أعد الاختبار.');
  process.exit();
}

clearReciterDataCaches();
const catalog = await loadReciterCatalogWithImages({ refresh: true });
console.log(`👥 Canonical reciters: ${catalog.length}`);

if (!catalog.length) fail('لم يتم العثور على audio catalog داخل data/json/surah/surah_1.json');

const badImages = catalog.filter((item) => item.image?.file && !item.image.file.startsWith(String(item.id).padStart(3, '0') + '-'));
if (badImages.length) {
  fail(`وجدت ${badImages.length} صورة لا تطابق قاعدة ID -> NNN-prefix`);
} else {
  console.log('✅ ID -> reciter image prefix mapping صحيح');
}

const tracked = await listAyahBayahReciters({ refresh: true });
console.log(`🎙️ Tracking reciters: ${tracked.length}`);

for (const folder of expectedFolders) {
  const item = tracked.find((r) => r.folder_name === folder);
  if (!item) {
    fail(`مجلد التتبع غير مقروء: ${folder}`);
    continue;
  }
  const summary = `${item.name} | id=${item.id ?? '-'} | QUL=${item.source_recitation_id ?? '-'} | ${item.recitation_type} | surahs=${item.surah_count} | ayahs=${item.ayah_count}`;
  if (item.surah_count < 1 && item.ayah_count < 1) fail(`بيانات فارغة: ${summary}`);
  else console.log(`✅ ${summary}`);
}

for (const sourceId of [959, 960]) {
  const item = await resolveAyahBayahReciter(sourceId);
  if (!item) fail(`تعذر resolve لرقم QUL ${sourceId}`);
  else console.log(`✅ QUL ${sourceId} -> ${item.name} (ID ${item.id ?? '-'})`);
}

if (!process.exitCode) console.log('🎉 RECITER_DATA_TESTS_OK');
