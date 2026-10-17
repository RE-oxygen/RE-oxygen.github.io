(() => {
  const toast = document.querySelector('.reach-toast');
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Copy failed');
  }

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await copyText(button.dataset.copy);
        showToast(`${button.dataset.label}已复制`);
      } catch {
        showToast('复制失败，请手动选择文字');
      }
    });
  });

  const record = document.querySelector('.reach-record');
  const recordHint = document.querySelector('.reach-record-hint');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  record?.addEventListener('click', () => {
    const spinning = record.classList.toggle('is-spinning');
    record.setAttribute('aria-pressed', String(spinning));
    record.setAttribute('aria-label', spinning ? '暂停唱片' : '转动唱片');
    if (recordHint) {
      recordHint.textContent = spinning
        ? (reducedMotion.matches ? '唱片已点亮 · 点击复原' : '唱片转动中 · 点击暂停')
        : '点击唱片转动 ↗';
    }
  });
})();
