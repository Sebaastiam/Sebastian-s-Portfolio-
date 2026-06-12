/* ══════════════════════════════════════════════════
   drag.js — Draggable glass card + hover animations
   Depends on: config.js (CONFIG)
   ══════════════════════════════════════════════════ */

(function initDrag() {
  const el = document.getElementById('glassModule');
  if (!el) return;

  let originX = 0, originY = 0;
  let isDragging = false;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ── Pointer down: start drag if not on interactive child ── */
  function onDown(e) {
    if (e.target.closest('button, a, input, textarea, select')) return;
    e.preventDefault();
    isDragging = true;
    el.classList.add('dragging');
    const rect = el.getBoundingClientRect();
    originX = e.clientX - rect.left;
    originY = e.clientY - rect.top;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
  }

  /* ── Move: clamp within viewport ── */
  function onMove(e) {
    if (!isDragging) return;
    el.style.left = clamp(e.clientX - originX, 8, window.innerWidth  - el.offsetWidth  - 8) + 'px';
    el.style.top  = clamp(e.clientY - originY, 8, window.innerHeight - el.offsetHeight - 8) + 'px';
  }

  /* ── Up: end drag ── */
  function onUp() {
    isDragging = false;
    el.classList.remove('dragging');
    document.removeEventListener('pointermove', onMove);
  }

  /* ── Touch tap visual feedback ── */
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('button, a, input, textarea, select')) return;
    el.classList.add('touch-tap');
    setTimeout(() => el.classList.remove('touch-tap'), 160);
  });

  /* ── Hover: bounce in/out animations ── */
  el.addEventListener('pointerenter', () => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'bounceIn 900ms linear both';
  });
  el.addEventListener('pointerleave', () => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'bounceOut 700ms linear both';
  });

  /* ── Re-clamp position on window resize ── */
  window.addEventListener('resize', () => {
    const rect = el.getBoundingClientRect();
    el.style.left = clamp(rect.left, 8, window.innerWidth  - el.offsetWidth  - 8) + 'px';
    el.style.top  = clamp(rect.top,  8, window.innerHeight - el.offsetHeight - 8) + 'px';
  });

  el.addEventListener('pointerdown', onDown);
})();
