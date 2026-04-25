const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Cache model instance — avoid re-creating on every request
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);

function sanitize(text) {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

router.post('/chat', async (req, res) => {
  const { message, topic, level } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const safeMessage = sanitize(message).slice(0, 1000);
  const safeTopic = topic ? sanitize(topic).slice(0, 100) : 'general';
  const safeLevel = VALID_LEVELS.has(level) ? level : 'beginner';

  try {
    const history = await db.all(
      `SELECT role, content FROM chat_history
       WHERE user_id = 1 AND topic = ?
       ORDER BY created_at DESC LIMIT 10`,
      [safeTopic]
    );
    history.reverse();

    const systemPrompt = `You are a friendly, adaptive learning assistant.
Topic: "${safeTopic}". Level: ${safeLevel}.
Be concise, clear, and encouraging. Adapt depth to the level.
Offer a quiz when appropriate. Keep responses under 300 words unless more is needed.`;

    const chatHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 600 }
    });

    const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${safeMessage}`);
    const response = result.response.text();

    // Persist user + assistant messages in parallel
    await Promise.all([
      db.run(
        `INSERT INTO chat_history (user_id, role, content, topic) VALUES (1, 'user', ?, ?)`,
        [safeMessage, safeTopic]
      ),
      db.run(
        `INSERT INTO chat_history (user_id, role, content, topic) VALUES (1, 'assistant', ?, ?)`,
        [response, safeTopic]
      )
    ]);

    // Upsert learning progress
    const existing = await db.get(
      `SELECT id FROM learning_progress WHERE user_id = 1 AND topic = ?`, [safeTopic]
    );
    if (!existing) {
      await db.run(
        `INSERT INTO learning_progress (user_id, topic, completed) VALUES (1, ?, 0)`, [safeTopic]
      );
    } else {
      await db.run(
        `UPDATE learning_progress SET last_studied = CURRENT_TIMESTAMP WHERE user_id = 1 AND topic = ?`,
        [safeTopic]
      );
    }

    res.json({ response, topic: safeTopic });
  } catch (err) {
    console.error('AI chat error:', err.message);
    const isQuota = err.message?.includes('429') || err.message?.includes('quota');
    res.status(500).json({
      error: isQuota
        ? 'API quota exceeded. Please try again later.'
        : 'Failed to get AI response. Please try again.'
    });
  }
});

router.post('/quiz/generate', async (req, res) => {
  const { topic, level, count } = req.body;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const safeTopic = sanitize(topic).slice(0, 100);
  const safeLevel = VALID_LEVELS.has(level) ? level : 'beginner';
  const safeCount = Math.min(Math.max(parseInt(count, 10) || 4, 2), 8);

  try {
    const prompt = `Generate ${safeCount} multiple choice questions about "${safeTopic}" for a ${safeLevel} learner.

Return ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this is correct (1-2 sentences)."
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: 'Failed to parse quiz. Please try again.' });
    }

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return res.status(500).json({ error: 'Invalid quiz format received.' });
    }

    res.json({ questions: parsed.questions, topic: safeTopic });
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    const isQuota = err.message?.includes('429') || err.message?.includes('quota');
    res.status(500).json({
      error: isQuota
        ? 'API quota exceeded. Please try again later.'
        : 'Failed to generate quiz. Please try again.'
    });
  }
});

module.exports = router;
