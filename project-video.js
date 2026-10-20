document.querySelectorAll('.project-film-frame').forEach((frame) => {
  const launch = frame.querySelector('.project-film-launch');
  const video = frame.querySelector('.project-film-video');
  const source = video?.querySelector('source[data-src]');
  if (!launch || !video || !source) return;

  launch.addEventListener('click', () => {
    source.src = source.dataset.src;
    source.removeAttribute('data-src');
    video.hidden = false;
    launch.hidden = true;
    frame.classList.add('is-playing');
    video.load();
    video.play().catch(() => {
      // The native controls remain available when autoplay is blocked.
    });
  }, { once: true });
});
