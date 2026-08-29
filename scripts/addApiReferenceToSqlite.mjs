import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const apiReferenceFilePath = path.join(root, 'data', 'json', 'api_reference.json');
const dbFilePath = path.join(root, 'data', 'sqlite', 'database.sqlite');

export async function run() {
  const apiReferenceData = JSON.parse(await readFile(apiReferenceFilePath, 'utf8'));
  if (!apiReferenceData?.api_info?.title) throw new Error('api_reference.json لا يحتوي api_info صالح.');

  const db = new DatabaseSync(dbFilePath);
  try {
    db.exec(`
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
      );
    `);

    const insert = db.prepare(`
      INSERT INTO api_reference (
        title, description, version, base_url,
        documentation_url, github_url, json_content, statistics
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      db.exec('DELETE FROM api_reference;');
      insert.run(
        apiReferenceData.api_info.title,
        apiReferenceData.api_info.description ?? null,
        apiReferenceData.api_info.version ?? null,
        apiReferenceData.api_info.base_url ?? null,
        apiReferenceData.api_info.documentation_url ?? null,
        apiReferenceData.api_info.github_url ?? null,
        JSON.stringify(apiReferenceData),
        JSON.stringify(apiReferenceData.statistics ?? {})
      );
      db.exec('COMMIT;');
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }

    const row = db.prepare('SELECT id, title, version FROM api_reference LIMIT 1').get();
    const count = Number(db.prepare('SELECT COUNT(*) AS count FROM api_reference').get().count);
    if (count !== 1 || !row) throw new Error('فشل التحقق من جدول api_reference.');

    console.log(`✅ API Reference stored: ID=${row.id}, title=${row.title}, version=${row.version ?? 'n/a'}.`);
    return { count, id: Number(row.id), version: row.version ?? null };
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error('❌ addApiReferenceToSqlite failed:', error);
    process.exit(1);
  });
}
