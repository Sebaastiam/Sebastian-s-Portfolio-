/* ══════════════════════════════════════════════════
   drag.js — Draggable widgets (Glass card & Sticker button)
   Sebastián Castillo Portfolio — v1.4.1
   Perf fix (Issue #1): eliminated forced reflows in onDown() and
   resize handler by separating all DOM reads from DOM writes.
   onMove() was already correct (rAF-batched via applyPending).
   ══════════════════════════════════════════════════ */

(function initDrag() {
  const INTERACTIVE_SELECTOR = 'button:not(#contactTrigger), a, input, textarea, select';

  function makeDraggable(el) {
    if (!el) return;

    let originX = 0, originY = 0;
    let isDragging = false;
    let elWidth = 0, elHeight = 0;
    let baseLeft = 0, baseTop = 0;
    let pendingX = null, pendingY = null;
    let lastDX = 0, lastDY = 0;
    let rafId = 0;

    // .glassModule.dragging has a CSS transform: scale(1.01) (components-main.css);
    // .float-btn.dragging does not. Since the inline transform set below wins over
    // that class rule for whichever element has it, fold the same scale in only
    // for glassModule so its "pop" effect is preserved and float-btn stays unchanged.
    const dragScale = el.classList.contains('glassModule') ? ' scale(1.01)' : '';

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    function applyPending() {
      rafId = 0;
      if (pendingX === null) return;
      lastDX = pendingX - baseLeft;
      lastDY = pendingY - baseTop;
      // transform instead of left/top: compositor-only, no layout/reflow per frame
      el.style.transform = `translate3d(${lastDX}px, ${lastDY}px, 0)${dragScale}`;
      pendingX = pendingY = null;
    }

    function onDown(e) {
      e.preventDefault();

      /* PERF FIX: In the original code, getBoundingClientRect() (READ) was
         immediately followed by multiple style.* assignments (WRITE), and then
         offsetWidth/offsetHeight (READ again) — a classic forced-reflow pattern.
         Fix: batch ALL reads first, then do ALL writes in one pass.
         The position check (getComputedStyle) is done before any writes too. */

      // ── READ PHASE: gather all geometry before touching any style ──
      const rect        = el.getBoundingClientRect();
      const isFixed     = window.getComputedStyle(el).position === 'fixed';
      const measuredW   = el.offsetWidth;   // read now, before any write
      const measuredH   = el.offsetHeight;  // read now, before any write
      const currentLeft = parseFloat(el.style.left) || rect.left;
      const currentTop  = parseFloat(el.style.top)  || rect.top;

      // ── WRITE PHASE: apply all style changes at once ──
      isDragging = true;
      el.classList.add('dragging');

      if (!isFixed) {
        el.style.cssText += ';transition:none;animation:none;transform:none;margin:0;position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px';
      }

      // ── Assign from pre-read values (no style read after write) ──
      baseLeft = currentLeft;
      baseTop  = currentTop;
      originX  = e.clientX - rect.left;
      originY  = e.clientY - rect.top;
      elWidth  = measuredW;
      elHeight = measuredH;

      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerup',     onUp, { once: true });
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
      document.removeEventListener('pointerup',     onUp);
      document.removeEventListener('pointercancel', onUp);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      pendingX = pendingY = null;
      // Bake the transform-based offset back into left/top once, so the
      // resize handler (and any future drag start) keeps working off
      // left/top as the resting-state source of truth — transform is only
      // used for the active per-frame movement itself.
      if (lastDX !== 0 || lastDY !== 0) {
        el.style.left      = (baseLeft + lastDX) + 'px';
        el.style.top       = (baseTop  + lastDY) + 'px';
        el.style.transform = 'none';
        lastDX = lastDY = 0;
      }
    }

    el.addEventListener('pointerdown', e => {
      // Allow dragging the button itself, but not links inside the card
      if (e.target.closest(INTERACTIVE_SELECTOR) && el.id !== 'contactTrigger') {
        return;
      }
      el.classList.add('touch-tap');
      setTimeout(() => el.classList.remove('touch-tap'), 160);
      onDown(e);
    });

    /* PERF FIX: resize handler had the same read-write-read pattern.
       Fix: read rect + offsetWidth/Height together FIRST, then write. */
    window.addEventListener('resize', () => {
      if (window.getComputedStyle(el).position !== 'fixed') return;

      // ── READ PHASE ──
      const rect = el.getBoundingClientRect();
      const w    = el.offsetWidth;
      const h    = el.offsetHeight;

      // ── WRITE PHASE ──
      el.style.left = clamp(rect.left, 8, window.innerWidth  - w - 8) + 'px';
      el.style.top  = clamp(rect.top,  8, window.innerHeight - h - 8) + 'px';
    }, { passive: true });
  }

  // Initialize both draggable widgets
  makeDraggable(document.getElementById('glassModule'));
  makeDraggable(document.getElementById('contactTrigger'));
})();
