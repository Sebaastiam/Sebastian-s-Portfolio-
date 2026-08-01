/* ══════════════════════════════════════════════════
   drag.js — Draggable widgets (Glass card & Sticker button)
   Sebastián Castillo Portfolio — v1.4.0
   ══════════════════════════════════════════════════ */

(function initDrag() {
  const INTERACTIVE_SELECTOR = 'button:not(#contactTrigger), a, input, textarea, select';

  function makeDraggable(el) {
    if (!el) return;

    let originX = 0, originY = 0;
    let isDragging = false;
    let elWidth = 0, elHeight = 0;
    let pendingX = null, pendingY = null;
    let rafId = 0;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    function applyPending() {
      rafId = 0;
      if (pendingX === null) return;
      el.style.left = pendingX + 'px';
      el.style.top  = pendingY + 'px';
      pendingX = pendingY = null;
    }

    function onDown(e) {
      e.preventDefault();
      isDragging = true;
      el.classList.add('dragging');
      
      // Pop to fixed so it can drag anywhere freely
      const rect = el.getBoundingClientRect();
      
      // Only lock to fixed if it isn't already, to prevent jumps
      if (window.getComputedStyle(el).position !== 'fixed') {
        el.style.transition = 'none'; // stop entrance animations
        el.style.animation = 'none';
        el.style.transform = 'none'; // clear transform so left/top map exactly to screen
        el.style.margin = '0';
        el.style.position = 'fixed';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
      }

      originX = e.clientX - rect.left;
      originY = e.clientY - rect.top;
      elWidth = el.offsetWidth;
      elHeight = el.offsetHeight;
      
      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerup', onUp, { once: true });
      document.addEventListener('pointercancel', onUp, { once: true });
    }

    function onMove(e) {
      if (!isDragging) return;
      pendingX = clamp(e.clientX - originX, 8, window.innerWidth  - elWidth  - 8);
      pendingY = clamp(e.clientY - originY, 8, window.innerHeight - elHeight - 8);
      if (!rafId) rafId = requestAnimationFrame(applyPending);
    }

    function onUp() {
      isDragging = false;
      el.classList.remove('dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      pendingX = pendingY = null;
    }

    el.addEventListener('pointerdown', e => {
      // Allow dragging the button itself, but not links inside the card
      if (e.target.closest(INTERACTIVE_SELECTOR) && el.id !== 'contactTrigger') {
        // If clicking a button inside the glass card, don't drag
        return; 
      }
      el.classList.add('touch-tap');
      setTimeout(() => el.classList.remove('touch-tap'), 160);
      onDown(e);
    });

    window.addEventListener('resize', () => {
      if (window.getComputedStyle(el).position !== 'fixed') return;
      const rect = el.getBoundingClientRect();
      el.style.left = clamp(rect.left, 8, window.innerWidth  - el.offsetWidth  - 8) + 'px';
      el.style.top  = clamp(rect.top,  8, window.innerHeight - el.offsetHeight - 8) + 'px';
    }, { passive: true });
  }

  // Initialize both draggable widgets
  makeDraggable(document.getElementById('glassModule'));
  makeDraggable(document.getElementById('contactTrigger'));
})();
