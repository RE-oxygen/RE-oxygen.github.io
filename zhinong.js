(() => {
  const progress = document.querySelector('.zn-progress');
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0}%`;
  };
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();
  const tabs = [...document.querySelectorAll('.zn-feature-tab')];
  const panels = [...document.querySelectorAll('.zn-feature-panel')];
  function activate(index, focus = false) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
      panels[i].classList.toggle('is-active', active);
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', event => {
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      activate((index + step + tabs.length) % tabs.length, true);
    });
  });

  const dialog = document.querySelector('.zn-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const fullImage = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  document.querySelectorAll('[data-image]').forEach(button => {
    button.addEventListener('click', () => {
      fullImage.src = button.dataset.image;
      fullImage.alt = button.querySelector('img')?.alt || button.dataset.caption || '项目画面';
      caption.textContent = button.dataset.caption || '';
      dialog.showModal();
    });
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
})();
