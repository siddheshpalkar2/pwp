const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'progress_test.db');
process.env.DB_PATH = TEST_DB;

jest.mock('../database/db', () => {
  const actual = jest.requireActual('../database/db');
  return actual;
});

const request = require('supertest');
const express = require('express');
const db = require('../database/db');
const progressRouter = require('../routes/progress');

const app = express();
app.use(express.json());
app.use('/api/progress', progressRouter);

beforeAll(async () => {
  db.init();
  await new Promise(r => setTimeout(r, 200));
});

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

beforeEach(async () => {
  await db.run(`DELETE FROM learning_progress`);
  await db.run(`DELETE FROM quiz_scores`);
  await db.run(`DELETE FROM chat_history`);
});

describe('GET /api/progress/summary', () => {
  test('returns empty state initially', async () => {
    const res = await request(app).get('/api/progress/summary');
    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual([]);
    expect(res.body.scores).toEqual([]);
    expect(res.body.totalQuizzes).toBe(0);
    expect(res.body.avgScore).toBe(0);
    expect(res.body.streak).toBe(0);
  });

  test('returns topics after inserting learning progress', async () => {
    await db.run(
      `INSERT INTO learning_progress (user_id, topic, completed) VALUES (1, 'Physics', 0)`
    );
    const res = await request(app).get('/api/progress/summary');
    expect(res.status).toBe(200);
    expect(res.body.topics.length).toBe(1);
    expect(res.body.topics[0].topic).toBe('Physics');
  });

  test('calculates average score correctly', async () => {
    await db.run(`INSERT INTO quiz_scores (user_id, topic, score, total) VALUES (1, 'Math', 4, 5)`);
    await db.run(`INSERT INTO quiz_scores (user_id, topic, score, total) VALUES (1, 'Math', 2, 5)`);
    const res = await request(app).get('/api/progress/summary');
    expect(res.status).toBe(200);
    expect(res.body.totalQuizzes).toBe(2);
    expect(res.body.avgScore).toBe(60); // (80 + 40) / 2
  });

  test('response has correct shape', async () => {
    const res = await request(app).get('/api/progress/summary');
    expect(res.body).toHaveProperty('topics');
    expect(res.body).toHaveProperty('scores');
    expect(res.body).toHaveProperty('totalQuizzes');
    expect(res.body).toHaveProperty('avgScore');
    expect(res.body).toHaveProperty('streak');
  });
});

describe('POST /api/progress/quiz-score', () => {
  test('saves a valid score', async () => {
    await db.run(
      `INSERT INTO learning_progress (user_id, topic, completed) VALUES (1, 'Biology', 0)`
    );
    const res = await request(app)
      .post('/api/progress/quiz-score')
      .send({ topic: 'Biology', score: 4, total: 5 });
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
  });

  test('marks topic as mastered when score >= 70%', async () => {
    await db.run(
      `INSERT INTO learning_progress (user_id, topic, completed) VALUES (1, 'Chemistry', 0)`
    );
    await request(app)
      .post('/api/progress/quiz-score')
      .send({ topic: 'Chemistry', score: 4, total: 5 }); // 80%

    const topic = await db.get(
      `SELECT completed FROM learning_progress WHERE topic = 'Chemistry'`
    );
    expect(topic.completed).toBe(1);
  });

  test('does not mark topic mastered when score < 70%', async () => {
    await db.run(
      `INSERT INTO learning_progress (user_id, topic, completed) VALUES (1, 'History', 0)`
    );
    await request(app)
      .post('/api/progress/quiz-score')
      .send({ topic: 'History', score: 2, total: 5 }); // 40%

    const topic = await db.get(
      `SELECT completed FROM learning_progress WHERE topic = 'History'`
    );
    expect(topic.completed).toBe(0);
  });

  test('returns 400 when topic is missing', async () => {
    const res = await request(app)
      .post('/api/progress/quiz-score')
      .send({ score: 3, total: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when score is missing', async () => {
    const res = await request(app)
      .post('/api/progress/quiz-score')
      .send({ topic: 'Math', total: 5 });
    expect(res.status).toBe(400);
  });

  test('clamps score to valid range', async () => {
    const res = await request(app)
      .post('/api/progress/quiz-score')
      .send({ topic: 'Art', score: 999, total: 5 });
    expect(res.status).toBe(200);
    const saved = await db.get(
      `SELECT score FROM quiz_scores WHERE topic = 'Art'`
    );
    expect(saved.score).toBeLessThanOrEqual(5);
  });
});

describe('DELETE /api/progress/clear', () => {
  test('clears all user data', async () => {
    await db.run(`INSERT INTO learning_progress (user_id, topic) VALUES (1, 'Test')`);
    await db.run(`INSERT INTO quiz_scores (user_id, topic, score, total) VALUES (1, 'Test', 3, 5)`);

    const res = await request(app).delete('/api/progress/clear');
    expect(res.status).toBe(200);
    expect(res.body.cleared).toBe(true);

    const topics = await db.all(`SELECT * FROM learning_progress WHERE user_id = 1`);
    const scores = await db.all(`SELECT * FROM quiz_scores WHERE user_id = 1`);
    expect(topics).toEqual([]);
    expect(scores).toEqual([]);
  });
});
