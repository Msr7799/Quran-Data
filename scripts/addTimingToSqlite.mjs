import { run as buildData } from './buildData.mjs';
export async function run() {
  console.warn('ℹ️ addTimingToSqlite now rebuilds the complete SQLite schema so timing, visual assets and ayah-by-ayah data stay consistent.');
  return buildData({ formats: { json: false, csv: false, sqlite: true }, clean: true });
}
if (import.meta.url === `file://${process.argv[1]}`) run().catch((e) => { console.error('❌ addTimingToSqlite failed:', e); process.exit(1); });
