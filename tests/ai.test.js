const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'ai_test.db');
process.env.DB_PATH = TEST_DB;
process.env.GEMINI_API_KEY = 'test-api-key';

// Mock Gemini SDK
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        startChat: jest.fn().mockReturnValue({
          sendMessage: jest.fn().mockResolvedValue({
            response: { text: () => 'This is a mocked AI response about the topic.' }
          })
        }),
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              questions: [
                {
                  question: 'What is 2 + 2?',
                  options: ['3', '4', '5', '6'],
                  correct: 1,
                  explanation: '2 + 2 equals 4.'
                },
                {
                  question: 'What color is the sky?',
                  options: ['Red', 'Green', 'Blue', 'Yellow'],
                  correct: 2,
                  explanation: 'The sky appears blue due to Rayleigh scattering.'
                }
              ]
            })
          }
        })
      })
    }))
  };
});

const request = require('supertest');
const express = require('express');
const db = require('../database/db');
const aiRouter = require('../routes/ai');

const app = express();
app.use(express.json());
app.use('/api/ai', aiRouter);

beforeAll(async () => {
  db.init();
  await new Promise(r => setTimeout(r, 200));
});

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

beforeEach(async () => {
  await db.run(`DELETE FROM chat_history`);
  await db.run(`DELETE FROM learning_progress`);
});

// ─── Chat endpoint ────────────────────────────────────────────────────────────

describe('POST /api/ai/chat', () => {
  test('returns AI response for valid message', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Explain photosynthesis', topic: 'Biology', level: 'beginner' });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('This is a mocked AI response about the topic.');
    expect(res.body.topic).toBe('Biology');
  });

  test('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ topic: 'Math', level: 'beginner' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for empty message', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: '   ', topic: 'Math' });
    expect(res.status).toBe(400);
  });

  test('defaults topic to "general" when not provided', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Hello', level: 'beginner' });
    expect(res.status).toBe(200);
    expect(res.body.topic).toBe('general');
  });

  test('defaults level to "beginner" for invalid level', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'What is gravity?', topic: 'Physics', level: 'expert' });
    expect(res.status).toBe(200);
  });

  test('saves chat history to database', async () => {
    await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Tell me about DNA', topic: 'Biology', level: 'beginner' });

    const history = await db.all(
      `SELECT * FROM chat_history WHERE topic = 'Biology'`
    );
    expect(history.length).toBe(2); // user + assistant
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
  });

  test('creates learning progress entry for new topic', async () => {
    await request(app)
      .post('/api/ai/chat')
      .send({ message: 'What is gravity?', topic: 'Physics', level: 'beginner' });

    const progress = await db.get(
      `SELECT * FROM learning_progress WHERE topic = 'Physics'`
    );
    expect(progress).toBeDefined();
    expect(progress.topic).toBe('Physics');
  });

  test('truncates message beyond 1000 characters', async () => {
    const longMsg = 'a'.repeat(1500);
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: longMsg, topic: 'Test' });
    expect(res.status).toBe(200);
  });

  test('accepts all valid learning levels', async () => {
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Test question', topic: 'Science', level });
      expect(res.status).toBe(200);
    }
  });
});

// ─── Quiz generation endpoint ─────────────────────────────────────────────────

describe('POST /api/ai/quiz/generate', () => {
  test('returns questions for valid topic', async () => {
    const res = await request(app)
      .post('/api/ai/quiz/generate')
      .send({ topic: 'Math', level: 'beginner', count: 2 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBe(2);
    expect(res.body.topic).toBe('Math');
  });

  test('question has required fields', async () => {
    const res = await request(app)
      .post('/api/ai/quiz/generate')
      .send({ topic: 'Science', level: 'beginner', count: 2 });

    const q = res.body.questions[0];
    expect(q).toHaveProperty('question');
    expect(q).toHaveProperty('options');
    expect(q).toHaveProperty('correct');
    expect(q).toHaveProperty('explanation');
    expect(Array.isArray(q.options)).toBe(true);
    expect(typeof q.correct).toBe('number');
  });

  test('returns 400 when topic is missing', async () => {
    const res = await request(app)
      .post('/api/ai/quiz/generate')
      .send({ level: 'beginner', count: 4 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('clamps count between 2 and 8', async () => {
    const res = await request(app)
      .post('/api/ai/quiz/generate')
      .send({ topic: 'History', level: 'beginner', count: 100 });
    expect(res.status).toBe(200);
  });

  test('defaults level to beginner for invalid level', async () => {
    const res = await request(app)
      .post('/api/ai/quiz/generate')
      .send({ topic: 'Art', level: 'unknown', count: 2 });
    expect(res.status).toBe(200);
  });
});

// ─── Gemini error handling ────────────────────────────────────────────────────

describe('Error handling', () => {
  test('returns 500 when Gemini API fails on chat', async () => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    // mock.results[0].value is the object returned by new GoogleGenerativeAI()
    const genAI = GoogleGenerativeAI.mock.results[0].value;
    genAI.getGenerativeModel.mockReturnValueOnce({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockRejectedValue(new Error('API quota exceeded'))
      })
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Hello', topic: 'Test', level: 'beginner' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  test('returns 500 when quiz JSON is malformed', async () => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = GoogleGenerativeAI.mock.results[0].value;
    genAI.getGenerativeModel.mockReturnValueOnce({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => 'not valid json at all' }
      })
    });

    const res = await request(app)
      .post('/api/ai/quiz/generate')
      .send({ topic: 'Math', level: 'beginner', count: 2 });

    expect(res.status).toBe(500);
  });
});
