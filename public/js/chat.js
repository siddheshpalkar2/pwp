// AI Chat module
(function () {
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const topicInput = document.getElementById('topicInput');
  const levelSelect = document.getElementById('globalLevel');

  function getLevel() { return levelSelect.value; }
  function getTopic() { return topicInput.value.trim() || 'general'; }

  function appendMsg(role, content) {
    const welcome = messagesEl.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

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
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/, '<p>$1</p>');
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
      appendMsg('assistant', `Sorry, I ran into an error: ${err.message}. Please try again.`);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // Send on button click
  sendBtn.addEventListener('click', sendMessage);

  // Send on Enter (not Shift+Enter)
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  // Quick start buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg;
      if (!topicInput.value.trim()) {
        topicInput.focus();
        topicInput.placeholder = 'Enter a topic first!';
        setTimeout(() => {
          topicInput.placeholder = 'e.g. Photosynthesis, Python, History...';
        }, 2000);
        return;
      }
      inputEl.value = msg;
      sendMessage();
    });
  });
})();
