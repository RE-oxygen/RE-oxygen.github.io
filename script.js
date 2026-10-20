// 页眉进度与小屏菜单。
const header = document.querySelector('#site-header');
const headerProgress = document.querySelector('.header-progress');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = [...document.querySelectorAll('#primary-nav a')];
const sections = navLinks.map(link => {
    const target = link.getAttribute('href');
    return target?.startsWith('#') ? document.querySelector(target) : null;
});

function updateHeader() {
    if (!header || !headerProgress) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    const availableScroll = document.documentElement.scrollHeight - window.innerHeight;
    headerProgress.style.width = `${availableScroll > 0 ? window.scrollY / availableScroll * 100 : 0}%`;
    const current = sections.reduce((active, section, index) =>
        section && section.getBoundingClientRect().top <= window.innerHeight * .35 ? index : active, -1);
    navLinks.forEach((link, index) => link.classList.toggle('is-active', index === current));
}
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('resize', updateHeader);
updateHeader();

function closeMenu() {
    if (!header || !menuToggle) return;
    header.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航菜单');
}
if (menuToggle && header) {
    menuToggle.addEventListener('click', () => {
        const open = menuToggle.getAttribute('aria-expanded') !== 'true';
        header.classList.toggle('menu-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    });
}
navLinks.forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

// The portrait responds to the pointer and cycles through three costumes.
const avatarStage = document.querySelector('.avatar-stage');
if (avatarStage) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const figures = [...avatarStage.querySelectorAll('.avatar-stage-figure')];
    const lookCount = document.querySelector('.avatar-look-count');
    const lookCaption = document.querySelector('.about-portrait-bottom .portrait-caption');
    const greeting = avatarStage.querySelector('.avatar-stage-greeting');
    const looks = [
        { key: 'original', name: '原始形象', label: 'ORIGINAL', image: 'images/avatar/avatar-3d.png' },
        { key: 'fantasy', name: '魂环装扮', label: 'SOUL RINGS', image: 'images/avatar/avatar-fantasy.png' },
        { key: 'orbit', name: '宇航装扮', label: 'ORBIT', image: 'images/avatar/avatar-orbit.png' },
        { key: 'prism', name: '棱镜装扮', label: 'PRISM', image: 'images/avatar/avatar-prism.png' },
    ];
    looks.slice(1).forEach(look => { const image = new Image(); image.src = look.image; });
    let lookIndex = 0;
    let visibleFigure = 0;
    let changing = false;
    let greetingTimer;
    avatarStage.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || reduceMotion.matches) return;
        const rect = avatarStage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        avatarStage.style.setProperty('--tilt-x', `${(-y * 7).toFixed(2)}deg`);
        avatarStage.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
        avatarStage.style.setProperty('--avatar-x', `${(x * 11).toFixed(1)}px`);
        avatarStage.style.setProperty('--avatar-y', `${(y * 8).toFixed(1)}px`);
    });
    avatarStage.addEventListener('pointerleave', () => {
        for (const property of ['--tilt-x', '--tilt-y', '--avatar-x', '--avatar-y']) {
            avatarStage.style.removeProperty(property);
        }
    });
    avatarStage.addEventListener('click', async () => {
        if (changing) return;
        changing = true;
        const nextIndex = (lookIndex + 1) % looks.length;
        const nextLook = looks[nextIndex];
        const incomingFigure = figures[1 - visibleFigure];
        incomingFigure.src = nextLook.image;
        try { await incomingFigure.decode(); } catch { /* Keep the current look if the image fails. */ }
        if (!incomingFigure.naturalWidth) { changing = false; return; }
        avatarStage.dataset.look = nextLook.key;
        lookCount.textContent = `LOOK ${String(nextIndex).padStart(2, '0')} / 03`;
        lookCaption.textContent = `${nextLook.label} / ${String(nextIndex).padStart(2, '0')}`;
        avatarStage.setAttribute('aria-label', `当前为${nextLook.name}，点击切换装扮`);
        greeting.textContent = nextLook.label;
        avatarStage.classList.remove('is-hello');
        void avatarStage.offsetWidth;
        avatarStage.classList.add('is-hello');
        incomingFigure.classList.add('is-visible');
        figures[visibleFigure].classList.remove('is-visible');
        visibleFigure = 1 - visibleFigure;
        lookIndex = nextIndex;
        clearTimeout(greetingTimer);
        greetingTimer = setTimeout(() => avatarStage.classList.remove('is-hello'), 1350);
        setTimeout(() => { changing = false; }, reduceMotion.matches ? 100 : 650);
    });
}

// 轮播图功能
function initCarousel() {
    // 获取所有需要的元素
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;

    const items = carousel.querySelectorAll('.carousel-item');
    const dotsContainer = document.querySelector('.carousel-dots');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');

    let currentIndex = 0;
    let interval;

    // 初始化轮播图样式
    carousel.style.display = 'flex';
    carousel.style.transition = 'transform 0.5s ease-in-out';
    items.forEach(item => {
        item.style.flex = '0 0 100%';
    });

    // 创建指示点
    if (dotsContainer) {
        dotsContainer.innerHTML = ''; // 清空现有指示点
        items.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    const dots = document.querySelectorAll('.dot');

    function updateCarousel() {
        carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    function goToSlide(index) {
        currentIndex = index;
        updateCarousel();
        resetInterval();
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % items.length;
        updateCarousel();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        updateCarousel();
    }

    function resetInterval() {
        if (interval) clearInterval(interval);
        interval = setInterval(nextSlide, 1000);
    }

    // 添加事件监听
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetInterval();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetInterval();
        });
    }

    // 鼠标悬停控制
    carousel.addEventListener('mouseenter', () => {
        if (interval) clearInterval(interval);
    });

    carousel.addEventListener('mouseleave', resetInterval);

    // 开始自动播放
    resetInterval();
}

// 确保在页面完全加载后初始化轮播图
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
} else {
    initCarousel();
}

// 在页面加载完成后再次初始化，以防某些资源未加载完成
window.addEventListener('load', initCarousel); 
