// Quiz module
(function () {
  let questions = [];
  let currentIdx = 0;
  let score = 0;
  let currentTopic = '';
  let answered = false;

  const setupEl = document.getElementById('quizSetup');
  const loadingEl = document.getElementById('quizLoading');
  const activeEl = document.getElementById('quizActive');
  const resultsEl = document.getElementById('quizResults');
  const generateBtn = document.getElementById('generateQuizBtn');
  const quizTopicInput = document.getElementById('quizTopic');
  const quizCountSel = document.getElementById('quizCount');
  const currentQEl = document.getElementById('currentQ');
  const totalQEl = document.getElementById('totalQ');
  const progressFill = document.getElementById('quizProgressFill');
  const quizTopicLabel = document.getElementById('quizTopicLabel');
  const questionText = document.getElementById('questionText');
  const optionsList = document.getElementById('optionsList');
  const explanationEl = document.getElementById('explanation');
  const nextBtn = document.getElementById('nextBtn');
  const quizErrorEl = document.getElementById('quizError');

  // Cache result elements — only looked up once
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const scoreNum = document.getElementById('scoreNum');
  const scoreTot = document.getElementById('scoreTot');
  const scorePct = document.getElementById('scorePct');

  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function show(el) {
    [setupEl, loadingEl, activeEl, resultsEl].forEach(e => e.classList.add('hidden'));
    el.classList.remove('hidden');
  }

  function showError(msg) {
    if (quizErrorEl) {
      quizErrorEl.textContent = msg;
      quizErrorEl.classList.remove('hidden');
      setTimeout(() => quizErrorEl.classList.add('hidden'), 4000);
    }
    show(setupEl);
  }

  generateBtn.addEventListener('click', async () => {
    const topic = quizTopicInput.value.trim();
    if (!topic) {
      quizTopicInput.focus();
      quizTopicInput.style.borderColor = 'var(--danger)';
      setTimeout(() => (quizTopicInput.style.borderColor = ''), 1500);
      return;
    }

    currentTopic = topic;
    show(loadingEl);

    try {
      const level = document.getElementById('globalLevel').value;
      const count = quizCountSel.value;

      const res = await fetch('/api/ai/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, count })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');

      questions = data.questions;
      currentIdx = 0;
      score = 0;
      startQuiz();
    } catch (err) {
      showError(err.message);
    }
  });

  function startQuiz() {
    totalQEl.textContent = questions.length;
    quizTopicLabel.textContent = currentTopic;
    show(activeEl);
    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[currentIdx];
    answered = false;

    currentQEl.textContent = currentIdx + 1;
    progressFill.style.width = `${(currentIdx / questions.length) * 100}%`;

    questionText.textContent = q.question;
    optionsList.innerHTML = '';
    explanationEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    q.options.forEach((opt, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="option-label">${LABELS[i] ?? i + 1}</span><span>${window.escapeHtml(opt)}</span>`;
      btn.addEventListener('click', () => selectAnswer(i, q.correct, q.explanation));
      li.appendChild(btn);
      optionsList.appendChild(li);
    });
  }

  function selectAnswer(chosen, correct, explanation) {
    if (answered) return;
    answered = true;

    optionsList.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      else if (i === chosen) btn.classList.add('wrong');
    });

    if (chosen === correct) score++;

    if (explanation) {
      explanationEl.textContent = explanation;
      explanationEl.classList.remove('hidden');
    }

    nextBtn.textContent = currentIdx < questions.length - 1 ? 'Next Question →' : 'See Results';
    nextBtn.classList.remove('hidden');
  }

  nextBtn.addEventListener('click', () => {
    currentIdx++;
    if (currentIdx < questions.length) renderQuestion();
    else showResults();
  });

  async function showResults() {
    progressFill.style.width = '100%';
    const pct = Math.round((score / questions.length) * 100);

    scoreNum.textContent = score;
    scoreTot.textContent = `/ ${questions.length}`;
    scorePct.textContent = `${pct}%`;

    if (pct >= 80) { resultIcon.textContent = '🏆'; resultTitle.textContent = 'Excellent work!'; }
    else if (pct >= 60) { resultIcon.textContent = '👍'; resultTitle.textContent = 'Good job!'; }
    else { resultIcon.textContent = '📚'; resultTitle.textContent = 'Keep studying!'; }

    show(resultsEl);

    // Fire-and-forget score save — non-critical
    fetch('/api/progress/quiz-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: currentTopic, score, total: questions.length })
    }).catch(() => {});
  }

  document.getElementById('retryBtn').addEventListener('click', () => {
    currentIdx = 0;
    score = 0;
    startQuiz();
  });

  document.getElementById('newQuizBtn').addEventListener('click', () => {
    quizTopicInput.value = '';
    show(setupEl);
  });

  document.getElementById('studyTopicBtn').addEventListener('click', () => {
    document.getElementById('topicInput').value = currentTopic;
    window.navigateTo?.('chat');
  });
})();
