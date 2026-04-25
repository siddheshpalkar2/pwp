const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function sanitize(text) {
  return text.replace(/<script[^>]*>.*?<\/script>/gi, '')
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
  const safeLevel = ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner';

  try {
    const history = await db.all(
      `SELECT role, content FROM chat_history WHERE user_id = 1 AND topic = ? ORDER BY created_at DESC LIMIT 10`,
      [safeTopic]
    );
    history.reverse();

    const systemPrompt = `You are a friendly, adaptive learning assistant.
The user is learning about: "${safeTopic}".
Their current level is: ${safeLevel}.
Adapt your explanations to this level. Be concise, clear, and encouraging.
Use simple language for beginners, add depth for intermediate/advanced.
When relevant, offer to give a short quiz to test understanding.
Format responses with clear structure. Keep responses under 300 words unless a detailed explanation is needed.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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

    await db.run(
      `INSERT INTO chat_history (user_id, role, content, topic) VALUES (1, 'user', ?, ?)`,
      [safeMessage, safeTopic]
    );
    await db.run(
      `INSERT INTO chat_history (user_id, role, content, topic) VALUES (1, 'assistant', ?, ?)`,
      [response, safeTopic]
    );

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
    res.status(500).json({ error: 'Failed to get AI response.' });
  }
});

router.post('/quiz/generate', async (req, res) => {
  const { topic, level, count } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const safeTopic = sanitize(topic).slice(0, 100);
  const safeLevel = ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner';
  const safeCount = Math.min(Math.max(parseInt(count) || 4, 2), 8);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `Generate ${safeCount} multiple choice questions about "${safeTopic}" for a ${safeLevel} learner.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation why this is correct"
    }
  ]
}

Rules:
- correct is the 0-based index of the correct option
- Make questions clear and educational
- Explanations should be 1-2 sentences`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: 'Failed to parse quiz. Please try again.' });
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(500).json({ error: 'Invalid quiz format received.' });
    }

    res.json({ questions: parsed.questions, topic: safeTopic });
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

module.exports = router;
