(() => {
  const progress = document.querySelector('.qn-progress');
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0}%`;
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  function makeTabs(tabSelector, panelSelector) {
    const tabs = [...document.querySelectorAll(tabSelector)];
    const panels = [...document.querySelectorAll(panelSelector)];
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
        const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        activate((index + step + tabs.length) % tabs.length, true);
      });
    });
  }
  makeTabs('.qn-hardware-tab', '.qn-hardware-panel');
  makeTabs('.qn-journey-step', '.qn-flow-copy article');
})();
