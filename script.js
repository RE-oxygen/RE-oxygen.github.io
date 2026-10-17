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

// 照片翻转：点击和键盘均可操作，状态同步给辅助技术。
const photoCard = document.querySelector('.photo-card');
if (photoCard) {
    photoCard.addEventListener('click', () => {
        const flipped = photoCard.classList.toggle('flipped');
        photoCard.setAttribute('aria-pressed', String(flipped));
        photoCard.setAttribute('aria-label', flipped ? '返回个人照片' : '查看另一张照片');
        const hint = document.querySelector('.portrait-toggle-hint');
        if (hint) hint.firstChild.textContent = flipped ? '点击返回照片 ' : '点击翻转照片 ';
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
