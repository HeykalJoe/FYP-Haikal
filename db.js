// MySQL confession database setup
const mysql = require('mysql2');

// Fill in your MySQL connection details
const db = mysql.createConnection({
  host: 'localhost',      // e.g., 'localhost' or your MySQL server
  user: 'SEAdmin',      // your MySQL username
  password: 'SintokEchoes123',  // your MySQL password
  database: 'confessiondb'     // your MySQL database name
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
