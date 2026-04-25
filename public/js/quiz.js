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

  function show(el) {
    [setupEl, loadingEl, activeEl, resultsEl].forEach(e => {
      e.classList.add('hidden');
    });
    el.classList.remove('hidden');
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
      if (!res.ok) throw new Error(data.error || 'Failed');

      questions = data.questions;
      currentIdx = 0;
      score = 0;
      startQuiz();
    } catch (err) {
      show(setupEl);
      alert('Failed to generate quiz: ' + err.message);
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
    progressFill.style.width = `${((currentIdx) / questions.length) * 100}%`;

    questionText.textContent = q.question;
    optionsList.innerHTML = '';
    explanationEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    const labels = ['A', 'B', 'C', 'D'];

    q.options.forEach((opt, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="option-label">${labels[i]}</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener('click', () => selectAnswer(i, q.correct, q.explanation));
      li.appendChild(btn);
      optionsList.appendChild(li);
    });
  }

  function selectAnswer(chosen, correct, explanation) {
    if (answered) return;
    answered = true;

    const btns = optionsList.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      else if (i === chosen) btn.classList.add('wrong');
    });

    if (chosen === correct) score++;

    if (explanation) {
      explanationEl.textContent = explanation;
      explanationEl.classList.remove('hidden');
    }

    if (currentIdx < questions.length - 1) {
      nextBtn.textContent = 'Next Question →';
      nextBtn.classList.remove('hidden');
    } else {
      nextBtn.textContent = 'See Results';
      nextBtn.classList.remove('hidden');
    }
  }

  nextBtn.addEventListener('click', () => {
    currentIdx++;
    if (currentIdx < questions.length) {
      renderQuestion();
    } else {
      showResults();
    }
  });

  async function showResults() {
    progressFill.style.width = '100%';
    const pct = Math.round((score / questions.length) * 100);

    document.getElementById('scoreNum').textContent = score;
    document.getElementById('scoreTot').textContent = `/ ${questions.length}`;
    document.getElementById('scorePct').textContent = `${pct}%`;

    let icon, title;
    if (pct >= 80) { icon = '🏆'; title = 'Excellent work!'; }
    else if (pct >= 60) { icon = '👍'; title = 'Good job!'; }
    else { icon = '📚'; title = 'Keep studying!'; }

    document.getElementById('resultIcon').textContent = icon;
    document.getElementById('resultTitle').textContent = title;

    show(resultsEl);

    try {
      await fetch('/api/progress/quiz-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: currentTopic, score, total: questions.length })
      });
    } catch (e) { /* non-critical */ }
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

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
