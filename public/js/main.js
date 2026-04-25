// Navigation and layout controller
(function () {
  const pages = {
    chat: { section: 'page-chat', title: 'AI Tutor' },
    quiz: { section: 'page-quiz', title: 'Quiz' },
    progress: { section: 'page-progress', title: 'Progress' }
  };

  let currentPage = 'chat';

  function navigate(page) {
    if (!pages[page] || page === currentPage) return;

    document.getElementById(pages[currentPage].section).classList.remove('active');
    document.getElementById(pages[currentPage].section).hidden = true;

    document.getElementById(pages[page].section).classList.add('active');
    document.getElementById(pages[page].section).hidden = false;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
      btn.setAttribute('aria-current', btn.dataset.page === page ? 'page' : 'false');
    });

    document.getElementById('pageTitle').textContent = pages[page].title;
    currentPage = page;
    closeSidebar();

    if (page === 'progress') window.loadProgress?.();
  }

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.getElementById('mobileMenuBtn').addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  // Expose navigate globally for cross-module use
  window.navigateTo = navigate;
  window.closeSidebar = closeSidebar;
})();
