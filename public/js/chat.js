// AI Chat module
(function () {
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const topicInput = document.getElementById('topicInput');
  const levelSelect = document.getElementById('globalLevel');

  // Track welcome screen presence with a flag — avoid repeated DOM queries
  let welcomeVisible = true;

  function getLevel() { return levelSelect.value; }
  function getTopic() { return topicInput.value.trim() || 'general'; }

  function appendMsg(role, content) {
    if (welcomeVisible) {
      messagesEl.querySelector('.welcome-msg')?.remove();
      welcomeVisible = false;
    }

    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const bubble = document.createElement('div');
    bubble.className = 'msg-content';
    bubble.innerHTML = formatText(content);

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant typing-indicator';
    wrap.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '🤖';

    const bubble = document.createElement('div');
    bubble.className = 'msg-content';
    bubble.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function hideTyping() {
    document.getElementById('typingIndicator')?.remove();
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatText(text) {
    // Escape HTML first, then apply safe markdown-like formatting
    const escaped = window.escapeHtml(text);

    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
      // Convert list lines to <li>, then wrap each contiguous block in <ul>
      .replace(/((?:^[-•] .+\n?)+)/gm, (block) => {
        const items = block.trim().replace(/^[-•] (.+)$/gm, '<li>$1</li>');
        return `<ul>${items}</ul>`;
      })
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^([^<].*)$/gm, '<p>$1</p>');
  }

  async function sendMessage() {
    const msg = inputEl.value.trim();
    if (!msg) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled = true;

    appendMsg('user', msg);
    showTyping();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, topic: getTopic(), level: getLevel() })
      });

      const data = await res.json();
      hideTyping();

      if (!res.ok) throw new Error(data.error || 'Request failed');
      appendMsg('assistant', data.response);
    } catch (err) {
      hideTyping();
      appendMsg('assistant', `Sorry, I ran into an error: ${window.escapeHtml(err.message)}. Please try again.`);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  // Quick start buttons — use a single delegated listener
  messagesEl.addEventListener('click', e => {
    const btn = e.target.closest('.quick-btn');
    if (!btn) return;
    if (!topicInput.value.trim()) {
      topicInput.focus();
      topicInput.placeholder = 'Enter a topic first!';
      setTimeout(() => {
        topicInput.placeholder = 'e.g. Photosynthesis, Python, History...';
      }, 2000);
      return;
    }
    inputEl.value = btn.dataset.msg;
    sendMessage();
  });
})();
