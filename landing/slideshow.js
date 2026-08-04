/* ══════════════════════════════════════════════════
   slideshow.js — Background slideshow + Ken Burns
   Sebastián Castillo Portfolio — v1.3.2
   Depends on: config.js (CONFIG)

   Milestone 3 (Performance Engineering) fixes applied:
     A — visibilitychange could call startCycle() directly, bypassing
         the boot()/started/image-preload gate entirely if the page
         loaded in a background tab and was switched to before the
         preload (or its fallback timeout) completed. Now defers to
         boot() when the cycle hasn't started yet, preserving the
         "don't start cycling until images are ready" guarantee.
     D — removed a duplicated header comment line.
     D2 — attempted, then reverted (see note at applyAnim(0) below) —
          would have introduced a real regression on hidden-tab loads.
   ══════════════════════════════════════════════════ */

(function initSlideshow() {
  const slides  = Array.from(document.querySelectorAll('.bg-slide'));
  const bgImgs  = Array.from(document.querySelectorAll('.bg-img'));
  const animSeq = CONFIG.SLIDE_ANIM_SEQ;

  let current = 0;
  let started = false;
  let intervalId = 0;

  /* Apply Ken Burns class to a specific slide image */
  function applyAnim(index) {
    const img = bgImgs[index];
    if (!img) return;
    img.className = 'bg-img';
    void img.offsetWidth; /* force reflow to restart animation — justified, see Milestone 3 audit */
    const anim = animSeq[index] || 'none';
    if (anim !== 'none') img.classList.add('anim-' + anim);
  }

  function startCycle() {
    if (intervalId || document.hidden) return;
    intervalId = setInterval(() => {
      requestAnimationFrame(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        applyAnim(current);
        slides[current].classList.add('active');
      });
    }, CONFIG.SLIDE_INTERVAL_MS);
  }

  function stopCycle() {
    clearInterval(intervalId);
    intervalId = 0;
  }

  /* Start cycling — called once images are ready or fallback fires */
  function boot() {
    if (started) return;
    started = true;
    clearTimeout(fallback);
    startCycle();
  }

  document.addEventListener('visibilitychange', () => {
    /* Fix A (Milestone 3): if the cycle hasn't started yet (page
       loaded in a background tab, switched to before preload/fallback
       completed), defer to boot() instead of calling startCycle()
       directly — preserves the "don't start until images are ready"
       guarantee. Once started, behaves exactly as before. */
    if (document.hidden) {
      stopCycle();
    } else if (started) {
      startCycle();
    } else {
      boot();
    }
  });

  /* Preload images to avoid flash on first transition */
  applyAnim(0); /* NOTE: an earlier draft of this fix made this
    conditional on !document.hidden as a marginal optimization —
    reverted. startCycle() only applies the animation class when
    advancing to the NEXT slide; nothing retroactively applies it to
    slide 0, so skipping this on hidden-tab load would leave slide 0
    permanently static until the cycle moved past it. Not worth the
    negligible reflow savings. */
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
