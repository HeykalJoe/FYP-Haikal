// Backfill script: add `lang` column (if missing) and populate it using a lightweight detector
// Usage: node scripts/backfill_lang.js

const db = require('../db');

function detectLanguage(text) {
  if (!text) return 'en';
  const sample = (text || '').toString().toLowerCase();
  const msWords = ['dan','yang','untuk','dengan','tidak','saya','kami','kamu','adalah','ini','itu','kepada','kerana','boleh','lagi','sangat'];
  const tokens = sample.split(/[^a-z\u00C0-\u024F0-9]+/).filter(Boolean);
  if (tokens.length === 0) return 'en';
  let msCount = 0;
  for (const t of tokens) if (msWords.includes(t)) msCount++;
  if (msCount >= 2 || msCount / tokens.length >= 0.02) return 'ms';
  return 'en';
}

async function query(sql, params=[]) {
  return new Promise((resolve, reject) => db.query(sql, params, (err, res) => err ? reject(err) : resolve(res)));
}

async function ensureLangColumn() {
  // Check information_schema for column
  const sql = `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'confessions' AND COLUMN_NAME = 'lang'`;
  const dbName = (db.config && db.config.database) || process.env.DB_NAME || null;
  if (!dbName) throw new Error('Cannot determine database name from db config');
  const res = await query(sql, [dbName]);
  const exists = res && res[0] && res[0].cnt > 0;
  if (exists) {
    console.log('lang column already exists.');
    return;
  }
  console.log('Adding lang column to confessions...');
  await query("ALTER TABLE confessions ADD COLUMN lang VARCHAR(8) DEFAULT 'en'");
  console.log('Added lang column (default en).');
}

async function backfillBatch(batchSize=500) {
  // Select rows where lang IS NULL or empty
  const rows = await query(`SELECT id, message FROM confessions WHERE lang IS NULL OR lang = '' LIMIT ?`, [batchSize]);
  if (!rows || rows.length === 0) return 0;
  console.log(`Processing ${rows.length} rows...`);
  for (const r of rows) {
    const lang = detectLanguage(r.message || '');
    try {
      await query('UPDATE confessions SET lang = ? WHERE id = ?', [lang, r.id]);
    } catch (e) {
      console.error('Failed to update id', r.id, e && e.message ? e.message : e);
    }
  }
  return rows.length;
}

async function run() {
  try {
    await ensureLangColumn();
    let count = 0;
    while (true) {
      const processed = await backfillBatch(500);
      count += processed;
      if (processed === 0) break;
    }
    console.log(`Backfill complete. Processed ${count} rows.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
