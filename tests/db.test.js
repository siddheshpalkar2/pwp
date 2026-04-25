const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'test.db');
process.env.DB_PATH = TEST_DB;

// Re-require after setting env var
const db = require('../database/db');

beforeAll(async () => {
  db.init();
  // Wait for init to complete
  await new Promise(r => setTimeout(r, 200));
});

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('Database - run()', () => {
  test('inserts a row and returns lastID', async () => {
    const result = await db.run(
      `INSERT INTO learning_progress (user_id, topic, completed) VALUES (1, 'Math', 0)`
    );
    expect(result.id).toBeGreaterThan(0);
  });

  test('updates a row and returns changes count', async () => {
    const result = await db.run(
      `UPDATE learning_progress SET completed = 1 WHERE topic = 'Math'`
    );
    expect(result.changes).toBe(1);
  });

  test('rejects on invalid SQL', async () => {
    await expect(db.run(`INSERT INTO nonexistent_table VALUES (1)`))
      .rejects.toThrow();
  });
});

describe('Database - get()', () => {
  test('retrieves a single row', async () => {
    const row = await db.get(
      `SELECT * FROM learning_progress WHERE topic = 'Math'`
    );
    expect(row).toBeDefined();
    expect(row.topic).toBe('Math');
    expect(row.completed).toBe(1);
  });

  test('returns undefined when no row matches', async () => {
    const row = await db.get(
      `SELECT * FROM learning_progress WHERE topic = 'nonexistent'`
    );
    expect(row).toBeUndefined();
  });
});

describe('Database - all()', () => {
  beforeAll(async () => {
    await db.run(`INSERT INTO quiz_scores (user_id, topic, score, total) VALUES (1, 'Math', 3, 5)`);
    await db.run(`INSERT INTO quiz_scores (user_id, topic, score, total) VALUES (1, 'Science', 5, 5)`);
  });

  test('retrieves multiple rows', async () => {
    const rows = await db.all(`SELECT * FROM quiz_scores WHERE user_id = 1`);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('returns empty array when no rows match', async () => {
    const rows = await db.all(
      `SELECT * FROM quiz_scores WHERE user_id = 999`
    );
    expect(rows).toEqual([]);
  });

  test('supports parameterized queries', async () => {
    const rows = await db.all(
      `SELECT * FROM quiz_scores WHERE topic = ?`, ['Science']
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].topic).toBe('Science');
  });
});

describe('Database - init()', () => {
  test('creates all required tables', async () => {
    const tables = await db.all(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    const names = tables.map(t => t.name);
    expect(names).toContain('users');
    expect(names).toContain('learning_progress');
    expect(names).toContain('quiz_scores');
    expect(names).toContain('chat_history');
  });

  test('seeds default user', async () => {
    const user = await db.get(`SELECT * FROM users WHERE id = 1`);
    expect(user).toBeDefined();
    expect(user.username).toBe('learner');
  });
});
