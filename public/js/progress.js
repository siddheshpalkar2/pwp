// Progress module
(function () {
  async function loadProgress() {
    try {
      const res = await fetch('/api/progress/summary');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      render(data);
    } catch (err) {
      console.error('Progress load error:', err.message);
    }
  }

  function render({ topics, scores, totalQuizzes, avgScore, streak }) {
    document.getElementById('statTopics').textContent = topics.length;
    document.getElementById('statCompleted').textContent = topics.filter(t => t.completed).length;
    document.getElementById('statQuizzes').textContent = totalQuizzes;
    document.getElementById('statAvg').textContent = avgScore + '%';
    document.getElementById('statStreak').textContent = streak;
    document.getElementById('streakCount').textContent = streak;

    renderTopics(topics);
    renderScores(scores);
  }

  function renderTopics(topics) {
    const el = document.getElementById('topicsList');
    if (!topics.length) {
      el.innerHTML = '<div class="empty-state">No topics studied yet.<br>Start a chat to begin!</div>';
      return;
    }

    el.innerHTML = topics.map(t => `
      <div class="topic-item">
        <span class="topic-name" title="${escHtml(t.topic)}">${escHtml(t.topic)}</span>
        <span class="topic-badge ${t.completed ? 'mastered' : 'learning'}">
          ${t.completed ? '✓ Mastered' : '⋯ Learning'}
        </span>
      </div>
    `).join('');
  }

  function renderScores(scores) {
    const el = document.getElementById('scoresList');
    if (!scores.length) {
      el.innerHTML = '<div class="empty-state">No quizzes taken yet.<br>Try a quiz to see scores here!</div>';
      return;
    }

    el.innerHTML = scores.map(s => {
      const pct = Math.round((s.score / s.total) * 100);
      const cls = pct >= 80 ? 'good' : pct >= 60 ? 'ok' : 'poor';
      const date = new Date(s.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `
        <div class="score-item">
          <span class="score-item-topic">${escHtml(s.topic)}</span>
          <div class="score-item-meta">
            <span class="score-pill ${cls}">${s.score}/${s.total}</span>
            <span>${date}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('clearDataBtn').addEventListener('click', async () => {
    if (!confirm('Clear all learning data? This cannot be undone.')) return;
    try {
      await fetch('/api/progress/clear', { method: 'DELETE' });
      render({ topics: [], scores: [], totalQuizzes: 0, avgScore: 0, streak: 0 });
    } catch (e) {
      alert('Failed to clear data.');
    }
  });

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.loadProgress = loadProgress;
})();
