// Script: fix_recipient_mapping.js
// Purpose: Backfill/correct recipient values in `confessions` to match new mapping:
//  - academic -> haikaljohari4747@gmail.com (HEA)
//  - mental   -> haidilah@gmail.com (HEP)
// Run: node scripts/fix_recipient_mapping.js

const db = require('../db');

function runQuery(sql, params=[]) {
  return new Promise((resolve, reject) => db.query(sql, params, (err, res) => err ? reject(err) : resolve(res)));
}

async function main() {
  console.log('Connecting and applying recipient fixes...');

  const tasks = [
    {
      desc: 'Assign HEP to NULL/empty recipients with mental topic',
      where: `(recipient IS NULL OR recipient = '') AND (LOWER(topic) LIKE '%mental%' OR LOWER(topic) LIKE '%mental health%' OR LOWER(topic) LIKE '%mental-health%' OR LOWER(topic) LIKE '%stress%' OR LOWER(topic) LIKE '%anxious%')`,
      set: `recipient = 'haidilah@gmail.com'`
    },
    {
      desc: 'Change recipient to HEP where previously set to HEA but topic is mental',
      where: `LOWER(recipient) = 'haikaljohari4747@gmail.com' AND (LOWER(topic) LIKE '%mental%' OR LOWER(topic) LIKE '%mental health%' OR LOWER(topic) LIKE '%mental-health%' OR LOWER(topic) LIKE '%stress%' OR LOWER(topic) LIKE '%anxious%')`,
      set: `recipient = 'haidilah@gmail.com'`
    },
    {
      desc: 'Change recipient to HEA where previously set to HEP but topic is academic/education',
      where: `LOWER(recipient) = 'haidilah@gmail.com' AND (LOWER(topic) LIKE '%academic%' OR LOWER(topic) LIKE '%akadem%' OR LOWER(topic) LIKE '%study%' OR LOWER(topic) LIKE '%education%' OR LOWER(topic) LIKE '%exam%' OR LOWER(topic) LIKE '%assignment%')`,
      set: `recipient = 'haikaljohari4747@gmail.com'`
    },
    {
      desc: 'Assign HEA to NULL/empty recipients with academic/education topic',
      where: `(recipient IS NULL OR recipient = '') AND (LOWER(topic) LIKE '%academic%' OR LOWER(topic) LIKE '%akadem%' OR LOWER(topic) LIKE '%study%' OR LOWER(topic) LIKE '%education%' OR LOWER(topic) LIKE '%exam%' OR LOWER(topic) LIKE '%assignment%')`,
      set: `recipient = 'haikaljohari4747@gmail.com'`
    }
  ];

  for (const t of tasks) {
    try {
      console.log('\n==> ' + t.desc);
      const updateSql = `UPDATE confessions SET ${t.set} WHERE ${t.where}`;
      const updateRes = await runQuery(updateSql);
      console.log('  Affected rows:', updateRes && (updateRes.affectedRows || updateRes.affectedRows === 0) ? updateRes.affectedRows : updateRes.length || 0);

      const selectSql = `SELECT id, topic, recipient FROM confessions WHERE ${t.where} LIMIT 8`;
      const rows = await runQuery(selectSql);
      console.log('  Sample rows (post-update):', rows.slice(0,8));
    } catch (e) {
      console.error('  Failed task:', t.desc, e);
    }
  }

  // Summary counts
  try {
    const counts = {};
    const q = `SELECT LOWER(recipient) as rec, COUNT(*) as cnt FROM confessions GROUP BY LOWER(recipient)`;
    const rows = await runQuery(q);
    rows.forEach(r => { counts[r.rec || '(null)'] = r.cnt; });
    console.log('\nRecipient distribution after fixes:', counts);
  } catch (e) {
    console.warn('Failed to read distribution:', e);
  }

  // close connection if db exposes end
  try { if (db && typeof db.end === 'function') db.end(); } catch(e){}
  console.log('\nDone.');
}

main().catch(e => { console.error('Script failed:', e); process.exit(1); });
