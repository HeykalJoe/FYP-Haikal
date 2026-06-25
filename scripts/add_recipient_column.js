// One-off script to add `recipient` column to `confessions` if it doesn't exist.
// Usage: node scripts/add_recipient_column.js

const db = require('../db');

const schema = 'confessiondb';
const table = 'confessions';
const column = 'recipient';

function closeAndExit(code=0) {
  try { db.end && db.end(); } catch(e){}
  process.exit(code);
}

const checkSql = `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`;
db.query(checkSql, [schema, table, column], (err, rows) => {
  if (err) {
    console.error('Failed to query information_schema:', err);
    return closeAndExit(2);
  }
  const cnt = rows && rows[0] && (rows[0].cnt || rows[0].CNT || rows[0]['cnt']) ? parseInt(rows[0].cnt||rows[0].CNT||rows[0]['cnt'],10) : 0;
  if (cnt > 0) {
    console.log(`Column '${column}' already exists on ${schema}.${table}. Nothing to do.`);
    return closeAndExit(0);
  }

  const alterSql = `ALTER TABLE ${table} ADD COLUMN ${column} VARCHAR(255) DEFAULT NULL`;
  console.log('Running:', alterSql);
  db.query(alterSql, (aErr, aRes) => {
    if (aErr) {
      console.error('ALTER TABLE failed:', aErr);
      return closeAndExit(3);
    }
    console.log('ALTER TABLE succeeded. Column added.');
    return closeAndExit(0);
  });
});
