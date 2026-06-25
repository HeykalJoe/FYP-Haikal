// scripts/update_recipients_academic.js
// Run from project root: node .\scripts\update_recipients_academic.js
// Uses the project's db helper (db.js) to run a broader academic-pattern UPDATE and prints results.

const db = require('../db');

function queryPromise(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

async function run() {
  try {
    console.log('Running broader academic update -> haidilah@gmail.com');

    const patterns = [
      '%academic%',
      '%acad%',
      '%study%',
      '%akadem%',
      '%kuliah%',
      '%education%',
      '%exam%',
      '%assignment%',
      '%kelas%'
    ];

    const whereClauses = patterns.map(() => 'LOWER(topic) LIKE ?').join(' OR ');
    const sql = `UPDATE confessions SET recipient = ? WHERE ${whereClauses}`;
    const params = ['haidilah@gmail.com', ...patterns];

    const res = await queryPromise(sql, params);
    console.log('Affected rows:', res && res.affectedRows ? res.affectedRows : res);

    const cnt = await queryPromise("SELECT COUNT(*) as cnt FROM confessions WHERE recipient = ?", ['haidilah@gmail.com']);
    console.log('Rows now assigned to haidilah@gmail.com:', cnt && cnt[0] ? cnt[0].cnt : cnt);

    const sample = await queryPromise("SELECT id, topic, recipient FROM confessions WHERE recipient = ? ORDER BY created_at DESC LIMIT 20", ['haidilah@gmail.com']);
    console.log('Sample rows:');
    console.table(sample);

    process.exit(0);
  } catch (e) {
    console.error('Error running academic update:', e);
    process.exit(1);
  }
}

run();
