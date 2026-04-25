const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'learning.db');
const db = new sqlite3.Database(DB_PATH);

function init() {
  db.serialize(() => {
    // WAL mode: better read concurrency and crash safety
    db.run(`PRAGMA journal_mode = WAL`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      topic TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      last_studied DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quiz_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      topic TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      topic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Indexes for hot query paths (user_id + topic lookups)
    db.run(`CREATE INDEX IF NOT EXISTS idx_progress_user_topic ON learning_progress(user_id, topic)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_user ON quiz_scores(user_id, taken_at DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_user_topic ON chat_history(user_id, topic, created_at DESC)`);

    db.run(`INSERT OR IGNORE INTO users (id, username) VALUES (1, 'learner')`, err => {
      if (err) console.error('DB init error:', err.message);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { init, run, get, all };
