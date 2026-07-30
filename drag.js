/* ══════════════════════════════════════════════════
   drag.js — Draggable glass card + hover animations
   Sebastián Castillo Portfolio — v1.3.2
   Depends on: config.js (CONFIG)

   Milestone 3 (Performance Engineering) fixes applied:
     A/B — onMove no longer reads+writes layout props synchronously
           on every pointermove (layout thrashing). offsetWidth/
           offsetHeight are cached once at drag-start; the actual
           style writes are batched into a single rAF callback per
           frame instead of one write per input event.
     C   — pointercancel is now handled (same cleanup as pointerup),
           closing a real state-leak: an OS-interrupted touch drag
           (notification, edge-gesture, etc.) previously left the
           card stuck in "dragging" state with a leaked document
           pointermove listener.
     E/F — pointermove/resize listeners marked passive: true (never
           call preventDefault, safe to mark).
     G   — the two separate pointerdown listeners (touch-tap feedback
           + drag start) are consolidated into one, so the interactive-
           element exclusion check runs once per event, not twice.
   ══════════════════════════════════════════════════ */

(function initDrag() {
  const el = document.getElementById('glassModule');
  if (!el) return;

  const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select';

  let originX = 0, originY = 0;
  let isDragging = false;
  let elWidth = 0, elHeight = 0;       /* cached at drag-start (fix A/B) */
  let pendingX = null, pendingY = null; /* latest clamped target, applied next rAF */
  let rafId = 0;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ── rAF-batched apply: at most one style write per frame,
     regardless of how many pointermove events arrived (fix A/B) ── */
  function applyPending() {
    rafId = 0;
    if (pendingX === null) return;
    el.style.left = pendingX + 'px';
    el.style.top  = pendingY + 'px';
    pendingX = pendingY = null;
  }

  /* ── Pointer down: start drag (interactive-element check already
     done by the caller — see consolidated pointerdown listener below) ── */
  function onDown(e) {
    e.preventDefault();
    isDragging = true;
    el.classList.add('dragging');
    const rect = el.getBoundingClientRect();
    originX = e.clientX - rect.left;
    originY = e.clientY - rect.top;
    elWidth = el.offsetWidth;   /* cached once — was re-read on every pointermove */
    elHeight = el.offsetHeight;
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { once: true });
    document.addEventListener('pointercancel', onUp, { once: true }); /* fix C */
  }

  /* ── Move: compute clamped target, defer the actual write to rAF ── */
  function onMove(e) {
    if (!isDragging) return;
    pendingX = clamp(e.clientX - originX, 8, window.innerWidth  - elWidth  - 8);
    pendingY = clamp(e.clientY - originY, 8, window.innerHeight - elHeight - 8);
    if (!rafId) rafId = requestAnimationFrame(applyPending);
  }

  /* ── Up / Cancel: end drag, always clean up regardless of how it ended ── */
  function onUp() {
    isDragging = false;
    el.classList.remove('dragging');
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    pendingX = pendingY = null;
  }

  /* ── Consolidated pointerdown: touch-tap feedback + drag start,
     one interactive-element check instead of two (fix G) ── */
  el.addEventListener('pointerdown', e => {
    if (e.target.closest(INTERACTIVE_SELECTOR)) return;
    el.classList.add('touch-tap');
    setTimeout(() => el.classList.remove('touch-tap'), 160);
    onDown(e);
  });

  /* ── Re-clamp position on window resize ── */
  window.addEventListener('resize', () => {
    const rect = el.getBoundingClientRect();
    el.style.left = clamp(rect.left, 8, window.innerWidth  - el.offsetWidth  - 8) + 'px';
    el.style.top  = clamp(rect.top,  8, window.innerHeight - el.offsetHeight - 8) + 'px';
  }, { passive: true });
})();
