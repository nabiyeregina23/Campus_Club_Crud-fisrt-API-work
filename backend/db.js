require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.resolve(__dirname, process.env.DB_PATH || './data/campus_crud.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const resetRequested = process.argv.includes('--reset');
if (resetRequested) {
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

const db = new DatabaseSync(dbPath);

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const { total } = db.prepare('SELECT COUNT(*) AS total FROM clubs').get();
if (total === 0) {
  db.exec(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
  console.log('Seeded clubs table with sample records.');
}

if (resetRequested && require.main === module) {
  console.log(`Database reset: ${dbPath}`);
}

module.exports = db;