(() => {
  const progress = document.querySelector('.zl-progress');
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0}%`;
  };
  addEventListener('scroll', updateProgress, { passive:true });
  addEventListener('resize', updateProgress);
  updateProgress();
  const tabs = [...document.querySelectorAll('.zl-stage-tab')];
  const panels = [...document.querySelectorAll('.zl-stage-panel')];
  function activate(index, focus = false) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', event => {
      const step = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      activate((index + step + tabs.length) % tabs.length, true);
    });
  });
})();
