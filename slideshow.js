/* ══════════════════════════════════════════════════
   slideshow.js — Background slideshow + Ken Burns
   Sebastián Castillo Portfolio — v1.3.2
   Depends on: config.js (CONFIG)
   Sebastián Castillo Portfolio — v1.3.2
   ══════════════════════════════════════════════════ */

(function initSlideshow() {
  const CONFIG = (window.PortfolioApp && window.PortfolioApp.CONFIG) || {};
  const slides  = Array.from(document.querySelectorAll('.bg-slide'));
  const bgImgs  = Array.from(document.querySelectorAll('.bg-img'));
  const animSeq = CONFIG.SLIDE_ANIM_SEQ || [];
  if (!slides.length || !bgImgs.length) return;

  let current = 0;
  let started = false;
  let intervalId = 0;

  /* Apply Ken Burns class to a specific slide image */
  function applyAnim(index) {
    bgImgs.forEach(el => el.classList.remove('is-animating'));
    const img = bgImgs[index];
    if (!img) return;
    img.className = 'bg-img';
    const anim = animSeq[index] || 'none';
    if (anim !== 'none') {
      img.classList.add('is-animating');
      img.classList.add('anim-' + anim);
    }
  }
  function startCycle() {
  if (intervalId || document.hidden) return;
  intervalId = setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    applyAnim(current);
    slides[current].classList.add('active');
  }, CONFIG.SLIDE_INTERVAL_MS || 4000);
}

function stopCycle() {
  clearInterval(intervalId);
  intervalId = 0;
}

document.addEventListener('visibilitychange', () => {
  document.hidden ? stopCycle() : startCycle();
});

  /* Start cycling — called once images are ready or fallback fires */
  function boot() {
    if (started) return;
    started = true;
    clearTimeout(fallback);

    startCycle()
  }

  /* Preload images to avoid flash on first transition */
  applyAnim(0);
  let loadedCount = 0;
  const imgEls = bgImgs.filter(img => img.style.backgroundImage);
  const total  = imgEls.length || 1;

  const fallback = setTimeout(boot, CONFIG.SLIDE_FALLBACK_MS || 2500);

  imgEls.forEach(img => {
    const url = img.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
    const el  = new Image();
    el.src    = url;
    el.onload = el.onerror = () => {
      if (++loadedCount === total) boot();
    };
  });
})();
