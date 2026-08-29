import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const jsonFilePath = path.join(root, 'data', 'mainDataQuran.json');
const csvFilePath = path.join(root, 'data', 'csv', 'database.csv');

const fields = ['number', 'name', 'revelation_place', 'verses_count', 'words_count', 'letters_count', 'verses', 'audio'];

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function run() {
  const jsonData = JSON.parse(await readFile(jsonFilePath, 'utf8'));
  if (!Array.isArray(jsonData) || jsonData.length !== 114) {
    throw new Error(`mainDataQuran.json غير صالح أو لا يحتوي 114 سورة.`);
  }

  const lines = [fields.map(csvCell).join(',')];
  for (const surah of jsonData) {
    lines.push(fields.map((field) => csvCell(surah[field])).join(','));
  }

  await mkdir(path.dirname(csvFilePath), { recursive: true });
  await writeFile(csvFilePath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`✅ CSV saved: ${csvFilePath} (${jsonData.length} rows + header)`);
  return { rows: jsonData.length, file: csvFilePath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error('❌ jsonToCsv failed:', error);
    process.exit(1);
  });
}
