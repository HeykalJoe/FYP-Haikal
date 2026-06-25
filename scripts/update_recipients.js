// scripts/update_recipients.js
// Run from project root: node .\scripts\update_recipients.js
// Uses the project's db helper (db.js) to run two UPDATE statements and prints results.

const db = require('../db');

function queryPromise(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
  });
}

async function run() {
  try {
    console.log('Running update 1: mental -> haikaljohari4747@gmail.com');
    const r1 = await queryPromise(
      "UPDATE confessions SET recipient = 'haikaljohari4747@gmail.com' WHERE topic LIKE ?",
      ['%mental%']
    );
    console.log('Update 1 affectedRows:', r1 && r1.affectedRows ? r1.affectedRows : r1);

    console.log("Running update 2: academic-like -> haidilah@gmail.com");
    const r2 = await queryPromise(
      "UPDATE confessions SET recipient = 'haidilah@gmail.com' WHERE topic LIKE ? OR topic LIKE ? OR topic LIKE ?",
      ['%academic%', '%akadem%', '%study%']
    );
    console.log('Update 2 affectedRows:', r2 && r2.affectedRows ? r2.affectedRows : r2);

    // Quick verification counts
    const cnt = await queryPromise("SELECT COUNT(*) as cnt FROM confessions WHERE recipient IS NOT NULL");
    console.log('Rows with recipient now:', cnt && cnt[0] ? cnt[0].cnt : cnt);

    // Optionally show a few updated rows
    const sample = await queryPromise("SELECT id, topic, recipient FROM confessions WHERE recipient IS NOT NULL ORDER BY created_at DESC LIMIT 10");
    console.log('Sample updated rows:');
    console.table(sample);

    process.exit(0);
  } catch (e) {
    console.error('Error running updates:', e);
    process.exit(1);
  }
}

run();
