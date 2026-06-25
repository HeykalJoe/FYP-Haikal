// MySQL confession database setup
const mysql = require('mysql2');

const useSsl = process.env.DB_SSL === '1' || process.env.DB_SSL === 'true';

// Read connection settings from environment so the app works locally and on Railway.
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'SEAdmin',
  password: process.env.DB_PASSWORD || 'SintokEchoes123',
  database: process.env.DB_NAME || 'confessiondb',
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

// Connect to MySQL and create table if it doesn't exist
db.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    return;
  }
  console.log('Connected to MySQL database.');
  // Create a table named `confessions` with the columns the server expects.
  // Note: server.js inserts into `confessions` and includes a `recipient` column.
  const createTable = `CREATE TABLE IF NOT EXISTS confessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    sentiment VARCHAR(50),
    sentimentScore FLOAT,
    topic VARCHAR(100),
    summary TEXT,
    recipient VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;
  db.query(createTable, (err) => {
    if (err) console.error('Failed to create confessions table:', err);
  });
});

module.exports = db;
