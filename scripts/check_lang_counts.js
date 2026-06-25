// Quick check script: report how many rows have NULL/empty `lang` and counts by language
// Usage: node scripts/check_lang_counts.js

const db = require('../db');

function query(sql, params = []) {
  return new Promise((resolve, reject) => db.query(sql, params, (err, res) => err ? reject(err) : resolve(res)));
}

async function run() {
  try {
    const missing = await query("SELECT COUNT(*) as cnt FROM confessions WHERE lang IS NULL OR lang = ''");
    const totalMissing = (missing && missing[0] && missing[0].cnt) ? missing[0].cnt : 0;
    console.log('Rows with NULL/empty lang:', totalMissing);

    const byLang = await query("SELECT IFNULL(lang,'(null)') as lang, COUNT(*) as cnt FROM confessions GROUP BY lang ORDER BY cnt DESC");
    console.log('\nCounts by lang:');
    for (const r of byLang) {
      console.log(`${r.lang}\t: ${r.cnt}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
