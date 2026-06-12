/* ══════════════════════════════════════════════════
   slideshow.js — Background slideshow + Ken Burns
   Depends on: config.js (CONFIG)
   ══════════════════════════════════════════════════ */

(function initSlideshow() {
  const slides  = Array.from(document.querySelectorAll('.bg-slide'));
  const bgImgs  = Array.from(document.querySelectorAll('.bg-img'));
  const animSeq = CONFIG.SLIDE_ANIM_SEQ;

  let current = 0;
  let started = false;

  /* Apply Ken Burns class to a specific slide image */
  function applyAnim(index) {
    const img = bgImgs[index];
    if (!img) return;
    img.className = 'bg-img';
    void img.offsetWidth; /* force reflow to restart animation */
    const anim = animSeq[index] || 'none';
    if (anim !== 'none') img.classList.add('anim-' + anim);
  }

  /* Start cycling — called once images are ready or fallback fires */
  function boot() {
    if (started) return;
    started = true;
    clearTimeout(fallback);

    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      applyAnim(current);
      slides[current].classList.add('active');
    }, CONFIG.SLIDE_INTERVAL_MS);
  }

  /* Preload images to avoid flash on first transition */
  applyAnim(0);
  let loadedCount = 0;
  const imgEls = bgImgs.filter(img => img.style.backgroundImage);
  const total  = imgEls.length || 1;

  const fallback = setTimeout(boot, CONFIG.SLIDE_FALLBACK_MS);

  imgEls.forEach(img => {
    const url = img.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
    const el  = new Image();
    el.src    = url;
    el.onload = el.onerror = () => {
      if (++loadedCount === total) boot();
    };
  });
})();
