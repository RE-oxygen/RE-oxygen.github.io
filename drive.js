(() => {
  const tabs = [...document.querySelectorAll('[data-drive-tab]')];
  const panels = [...document.querySelectorAll('[data-drive-panel]')];
  const progress = document.querySelector('.drive-progress');
  const dialog = document.getElementById('drive-image-dialog');

  function selectTab(index, moveFocus = false) {
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && moveFocus) tab.focus();
    });
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.toggle('is-active', panelIndex === index);
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  if (dialog) {
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('p');
    document.querySelectorAll('.drive-open-image').forEach(button => button.addEventListener('click', () => {
      image.src = button.dataset.image;
      image.alt = button.dataset.caption || '';
      caption.textContent = button.dataset.caption || '';
      dialog.showModal();
    }));
    dialog.querySelector('.drive-image-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  function updateProgress() {
    if (!progress) return;
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${total > 0 ? Math.min(100, scrollY / total * 100) : 0}%`;
  }
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();
})();
