// Progress module
(function () {
  // Cache DOM references — queried once, not on every render
  const els = {
    statTopics: document.getElementById('statTopics'),
    statCompleted: document.getElementById('statCompleted'),
    statQuizzes: document.getElementById('statQuizzes'),
    statAvg: document.getElementById('statAvg'),
    statStreak: document.getElementById('statStreak'),
    streakCount: document.getElementById('streakCount'),
    topicsList: document.getElementById('topicsList'),
    scoresList: document.getElementById('scoresList')
  };

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
    els.statTopics.textContent = topics.length;
    els.statCompleted.textContent = topics.filter(t => t.completed).length;
    els.statQuizzes.textContent = totalQuizzes;
    els.statAvg.textContent = `${avgScore}%`;
    els.statStreak.textContent = streak;
    els.streakCount.textContent = streak;
    renderTopics(topics);
    renderScores(scores);
  }

  function renderTopics(topics) {
    if (!topics.length) {
      els.topicsList.innerHTML = '<div class="empty-state">No topics studied yet.<br>Start a chat to begin!</div>';
      return;
    }

    els.topicsList.innerHTML = topics.map(t => `
      <div class="topic-item">
        <span class="topic-name" title="${window.escapeHtml(t.topic)}">${window.escapeHtml(t.topic)}</span>
        <span class="topic-badge ${t.completed ? 'mastered' : 'learning'}">
          ${t.completed ? '✓ Mastered' : '⋯ Learning'}
        </span>
      </div>
    `).join('');
  }

  function renderScores(scores) {
    if (!scores.length) {
      els.scoresList.innerHTML = '<div class="empty-state">No quizzes taken yet.<br>Try a quiz to see scores here!</div>';
      return;
    }

    els.scoresList.innerHTML = scores.map(s => {
      const pct = Math.round((s.score / s.total) * 100);
      const cls = pct >= 80 ? 'good' : pct >= 60 ? 'ok' : 'poor';
      const date = new Date(s.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `
        <div class="score-item">
          <span class="score-item-topic">${window.escapeHtml(s.topic)}</span>
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
      const res = await fetch('/api/progress/clear', { method: 'DELETE' });
      if (!res.ok) throw new Error('Server error');
      render({ topics: [], scores: [], totalQuizzes: 0, avgScore: 0, streak: 0 });
    } catch {
      alert('Failed to clear data. Please try again.');
    }
  });

  window.loadProgress = loadProgress;
})();
