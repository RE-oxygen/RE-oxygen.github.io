// 添加作品时，只需在这里增加一项，并放入对应的封面和详情页。
const projects = [
  {
    title: '轻脑',
    subtitle: '偏头痛干预设备',
    description: '从贴合、触觉调节到 App 反馈，重构偏头痛干预体验',
    category: 'PRODUCT / HEALTHCARE',
    cover: 'images/portfolio/portfolio1-detail1.png',
    coverRatio: 1544 / 870,
    coverPosition: '50% 50%',
    href: 'portfolio-1.html',
    accent: '#b993b5'
  },
  {
    title: '智农',
    subtitle: '面向农户的智慧农事服务',
    description: '从田间研究到任务提醒，让农事信息真正抵达农户',
    category: 'SERVICE / AGRICULTURE',
    cover: 'images/portfolio/zhinong-03.jpg',
    coverRatio: 1600 / 900,
    coverPosition: '57% 50%',
    href: 'portfolio-5.html',
    accent: '#a9db69'
  },
  {
    title: '知鹿',
    subtitle: '儿童认知训练互动系统',
    description: '让真实物体开口，连接课堂训练与日常理解',
    category: 'INCLUSIVE / EDUCATION',
    cover: 'images/portfolio/portfolio2-bg.jpg',
    coverRatio: 5532 / 3108,
    coverPosition: '54% 50%',
    href: 'portfolio-2.html',
    accent: '#82c9a3'
  },
  {
    title: '智能驾驶',
    subtitle: '极越 07 · 车辆与座舱体验',
    description: '从上车到离车，降低新旧驾驶习惯的切换成本',
    category: 'UX / MOBILITY',
    cover: 'images/portfolio/portfolio3-bg.png',
    coverRatio: 4946 / 2898,
    coverPosition: '55% 50%',
    href: 'portfolio-3.html',
    accent: '#55b5b0'
  },
  {
    title: 'Pulito',
    subtitle: '视障人群家务辅助 App',
    description: '从无障碍视角出发，重新设计日常家务体验',
    category: 'ACCESSIBILITY / APP',
    cover: 'images/portfolio/portfolio4-bg.png',
    coverRatio: 2480 / 1652,
    coverPosition: '50% 50%',
    href: 'portfolio-4.html',
    accent: '#78aef4'
  }
];

const albumViewport = document.getElementById('album-viewport');
const albumTrack = document.getElementById('album-track');

if (albumViewport && albumTrack && projects.length) {
  const number = index => String(index + 1).padStart(2, '0');
  const total = String(projects.length).padStart(2, '0');
  document.getElementById('album-total').textContent = `/ ${total}`;

  const cards = projects.map((project, index) => {
    const card = document.createElement('a');
    card.className = 'album-card';
    card.href = project.href;
    card.setAttribute('aria-label', `${project.title}：${project.subtitle}，查看项目`);
    card.style.setProperty('--album-accent', project.accent);
    card.style.setProperty('--cover-position', project.coverPosition);
    card.style.setProperty('--cover-ratio', project.coverRatio);
    card.innerHTML = `
      <span class="album-object" aria-hidden="true">
        <span class="album-disc"></span>
        <span class="album-spine"></span>
        <span class="album-cover">
          <span class="album-artwork"><img src="${project.cover}" alt="" loading="lazy"></span>
          <span class="album-cover-label"><span>OXYGEN / EDITION ${number(index)}</span><span>${number(index)} / ${total}</span></span>
        </span>
      </span>
      <span class="album-card-info"><span><strong>${project.title}</strong><small>${project.category}</small></span><span aria-hidden="true">↗</span></span>`;
    albumTrack.appendChild(card);
    return card;
  });

  const currentIndex = document.getElementById('album-current-index');
  const currentTitle = document.getElementById('album-current-title');
  const currentDescription = document.getElementById('album-current-description');
  const currentLink = document.getElementById('album-current-link');
  const previousButton = document.querySelector('[data-direction="prev"]');
  const nextButton = document.querySelector('[data-direction="next"]');
  const albumReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let scrollFrame = 0;
  let selectionLockUntil = 0;
  let wheelCooldownUntil = 0;
  let wheelDelta = 0;
  let lastWheelAt = 0;

  function selectAlbum(index) {
    const nextIndex = Math.max(0, Math.min(projects.length - 1, index));
    const changed = activeIndex !== nextIndex;
    activeIndex = nextIndex;
    const project = projects[activeIndex];
    cards.forEach((card, cardIndex) => card.classList.toggle('is-active', cardIndex === activeIndex));
    currentIndex.textContent = `${number(activeIndex)} / ${total}`;
    currentTitle.textContent = project.title;
    currentDescription.textContent = project.description;
    currentLink.href = project.href;
    currentLink.setAttribute('aria-label', `查看${project.title}项目`);
    previousButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === projects.length - 1;
    if (changed) {
      window.dispatchEvent(new CustomEvent('albumchange', {
        detail: { index: activeIndex, accent: project.accent }
      }));
    }
  }

  function moveTo(index) {
    const targetIndex = Math.max(0, Math.min(projects.length - 1, index));
    const viewportBox = albumViewport.getBoundingClientRect();
    const cardBox = cards[targetIndex].getBoundingClientRect();
    const left = albumViewport.scrollLeft + cardBox.left - viewportBox.left - (viewportBox.width - cardBox.width) / 2;
    selectionLockUntil = performance.now() + (albumReducedMotion.matches ? 0 : 680);
    selectAlbum(targetIndex);
    albumViewport.scrollTo({ left, behavior: albumReducedMotion.matches ? 'auto' : 'smooth' });
  }

  function selectCenteredAlbum() {
    if (performance.now() < selectionLockUntil) return;
    const center = albumViewport.getBoundingClientRect().left + albumViewport.clientWidth / 2;
    let nearest = 0;
    let distance = Infinity;
    cards.forEach((card, index) => {
      const box = card.getBoundingClientRect();
      const nextDistance = Math.abs(box.left + box.width / 2 - center);
      if (nextDistance < distance) { distance = nextDistance; nearest = index; }
    });
    selectAlbum(nearest);
  }

  cards.forEach((card, index) => {
    card.addEventListener('pointerenter', () => {
      if (performance.now() >= selectionLockUntil) selectAlbum(index);
    });
    card.addEventListener('focus', () => selectAlbum(index));
  });
  albumViewport.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; selectCenteredAlbum(); });
  }, { passive: true });
  albumViewport.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? albumViewport.clientHeight : 1);
    const direction = Math.sign(delta);
    if (!direction || activeIndex + direction < 0 || activeIndex + direction >= projects.length) {
      wheelDelta = 0;
      return;
    }
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelAt > 220 || Math.sign(wheelDelta) !== direction) wheelDelta = 0;
    lastWheelAt = now;
    if (now < wheelCooldownUntil) return;
    wheelDelta += delta;
    if (Math.abs(wheelDelta) < 28) return;
    wheelDelta = 0;
    wheelCooldownUntil = now + (albumReducedMotion.matches ? 280 : 680);
    moveTo(activeIndex + direction);
  }, { passive: false });
  albumViewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  previousButton.addEventListener('click', () => moveTo(activeIndex - 1));
  nextButton.addEventListener('click', () => moveTo(activeIndex + 1));
  window.addEventListener('resize', selectCenteredAlbum);
  selectAlbum(0);
}
