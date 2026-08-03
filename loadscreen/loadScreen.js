/* ══════════════════════════════════════════════════════════
   loadScreen.js
   Landing Redesign — Module 4 of 4 (Load Screen)
   Sebastián Castillo Portfolio — Engineering Pass v3.2 → UX/UI Phase
   Depends on: config.js (CONFIG.LOAD_SCREEN), photo-wall-media.js
   (PHOTO_WALL_MEDIA) — must load after both.

   WHAT THIS WAITS ON:
   - document.fonts.ready — custom fonts
   - Every file in PHOTO_WALL_MEDIA — images/videos
   - Hero avatar image (if routed)
   - loadscreen.css and loadscreen.js
   - Hard timeout (MAX_WAIT_MS) so a slow/failed asset never traps
   - Minimum display floor (MIN_DISPLAY_MS) so it never flash-vanishes
   ══════════════════════════════════════════════════════════ */

(function initLoadScreen() {
  const screen = document.getElementById('loadScreen');
  if (!screen) return;

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.LOAD_SCREEN) || { MAX_WAIT_MS: 4000, MIN_DISPLAY_MS: 4000 };
  const startTime = Date.now();
  let resolved = false;

  function hide() {
    if (resolved) return;
    resolved = true;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, cfg.MIN_DISPLAY_MS - elapsed);
    setTimeout(() => {
      screen.classList.add('is-hiding');
      screen.addEventListener('animationend', () => screen.remove(), { once: true });
      /* Fallback removal in case animationend doesn't fire for any
         reason (matches the same defensive pattern already applied
         in panels.js's onTransitionEnd) — not relying on the event
         alone for something this important to clean up. */
      setTimeout(() => { if (screen.isConnected) screen.remove(); }, 500);
    }, remaining);
  }

  /* ── Build the list of readiness promises ── */
  const waits = [];

  // Fonts
  if (document.fonts && document.fonts.ready) {
    waits.push(document.fonts.ready);
  }

  // Media (images/videos)
  if (typeof PHOTO_WALL_MEDIA !== 'undefined') {
    const VIDEO_EXT = /\.(webm|mp4)$/i;
    PHOTO_WALL_MEDIA.forEach(path => {
      waits.push(new Promise(resolve => {
        if (VIDEO_EXT.test(path)) {
          const v = document.createElement('video');
          v.src = path;
          v.onloadedmetadata = v.onerror = () => resolve();
        } else {
          const img = new Image();
          img.src = path;
          img.onload = img.onerror = () => resolve();
        }
      }));
    });
  }

  // Hero avatar opportunistic check
  const avatarEl = document.querySelector('.hero-avatar-wrap');
  if (avatar
