import { run as buildData } from './buildData.mjs';
export async function run() {
  console.warn('ℹ️ addApiReferenceToSqlite now rebuilds the complete SQLite schema to keep one consistent database.');
  return buildData({ formats: { json: false, csv: false, sqlite: true }, clean: true });
}
if (import.meta.url === `file://${process.argv[1]}`) run().catch((e) => { console.error('❌ addApiReferenceToSqlite failed:', e); process.exit(1); });
