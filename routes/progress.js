const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/summary', async (req, res) => {
  try {
    const topics = await db.all(
      `SELECT topic, completed, last_studied FROM learning_progress WHERE user_id = 1 ORDER BY last_studied DESC`
    );

    const scores = await db.all(
      `SELECT topic, score, total, taken_at FROM quiz_scores WHERE user_id = 1 ORDER BY taken_at DESC LIMIT 20`
    );

    const totalQuizzes = scores.length;
    const avgScore = totalQuizzes > 0
      ? Math.round(scores.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / totalQuizzes)
      : 0;

    const streak = await calcStreak();

    res.json({ topics, scores, totalQuizzes, avgScore, streak });
  } catch (err) {
    console.error('Progress error:', err.message);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

router.post('/quiz-score', async (req, res) => {
  const { topic, score, total } = req.body;

  if (!topic || score === undefined || !total) {
    return res.status(400).json({ error: 'topic, score, and total are required' });
  }

  const safeTopic = String(topic).slice(0, 100);
  const safeScore = Math.min(Math.max(parseInt(score), 0), parseInt(total));
  const safeTotal = Math.max(parseInt(total), 1);

  try {
    await db.run(
      `INSERT INTO quiz_scores (user_id, topic, score, total) VALUES (1, ?, ?, ?)`,
      [safeTopic, safeScore, safeTotal]
    );

    if (safeScore / safeTotal >= 0.7) {
      await db.run(
        `UPDATE learning_progress SET completed = 1 WHERE user_id = 1 AND topic = ?`,
        [safeTopic]
      );
    }

    res.json({ saved: true });
  } catch (err) {
    console.error('Save score error:', err.message);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    await db.run(`DELETE FROM chat_history WHERE user_id = 1`);
    await db.run(`DELETE FROM learning_progress WHERE user_id = 1`);
    await db.run(`DELETE FROM quiz_scores WHERE user_id = 1`);
    res.json({ cleared: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

async function calcStreak() {
  const rows = await db.all(
    `SELECT DATE(last_studied) as day FROM learning_progress WHERE user_id = 1
     UNION
     SELECT DATE(taken_at) as day FROM quiz_scores WHERE user_id = 1
     ORDER BY day DESC`
  );

  if (rows.length === 0) return 0;

  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const day = new Date(row.day);
    const diff = Math.round((today - day) / 86400000);
    if (diff === streak) streak++;
    else if (diff > streak) break;
  }

  return streak;
}

module.exports = router;
