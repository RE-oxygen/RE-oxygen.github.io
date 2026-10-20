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

  const appImages = [...document.querySelectorAll('.qn-app-open img')];
  const appDialog = document.getElementById('qn-app-lightbox');
  if (appDialog && appImages.length) {
    const enlarged = document.getElementById('qn-app-lightbox-image');
    const counter = document.getElementById('qn-app-lightbox-counter');
    const stage = appDialog.querySelector('.qn-app-lightbox-stage');
    let activeImage = 0;
    const showImage = index => {
      activeImage = (index + appImages.length) % appImages.length;
      enlarged.src = appImages[activeImage].src;
      enlarged.alt = appImages[activeImage].alt;
      counter.textContent = `${String(activeImage + 1).padStart(2, '0')} / ${String(appImages.length).padStart(2, '0')}`;
      stage.scrollTo(0, 0);
      if (!appDialog.open) appDialog.showModal();
    };
    appImages.forEach((image, index) => image.closest('button').addEventListener('click', () => showImage(index)));
    appDialog.querySelector('.qn-app-lightbox-close').addEventListener('click', () => appDialog.close());
    appDialog.querySelector('.qn-app-lightbox-prev').addEventListener('click', () => showImage(activeImage - 1));
    appDialog.querySelector('.qn-app-lightbox-next').addEventListener('click', () => showImage(activeImage + 1));
    appDialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') showImage(activeImage - 1);
      if (event.key === 'ArrowRight') showImage(activeImage + 1);
    });
  }
})();
