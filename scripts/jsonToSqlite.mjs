import { run as buildData } from './buildData.mjs';
export async function run() { return buildData({ formats: { json: false, csv: false, sqlite: true }, clean: true }); }
if (import.meta.url === `file://${process.argv[1]}`) run().catch((e) => { console.error('❌ jsonToSqlite failed:', e); process.exit(1); });
