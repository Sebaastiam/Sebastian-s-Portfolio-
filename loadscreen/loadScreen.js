/* ══════════════════════════════════════════════════════════
   loadScreen.js
   Landing Redesign — Module 4 of 4 (Load Screen)
   Sebastián Castillo Portfolio — Engineering Pass v3.2 → UX/UI Phase
   Depends on: config.js (CONFIG.LOAD_SCREEN), photo-wall-media.js
   (PHOTO_WALL_MEDIA) — must load after both.

   WHAT THIS WAITS ON (the "smart parameter" from the original
   planning conversation):
   - document.fonts.ready — your custom fonts (AuthenticDeclaration,
     BarlowSC, BebasNeue)
   - Every file in PHOTO_WALL_MEDIA — images via load/error, videos
     via loadedmetadata/error (own independent preload, doesn't
     depend on photoWall.js's own DOM — same pattern as
     slideshow.js's boot())
   - The hero avatar image, IF one is actually routed yet (checked
     opportunistically — doesn't block on this if it's still a
     placeholder, since you mentioned routing isn't done)

   PLUS a hard timeout (CONFIG.LOAD_SCREEN.MAX_WAIT_MS) so a single
   slow/failed asset can never trap a visitor indefinitely — same
   role as slideshow.js's SLIDE_FALLBACK_MS — and a minimum display
   floor (CONFIG.LOAD_SCREEN.MIN_DISPLAY_MS) so it never flash-
   vanishes on a fast connection.
   ══════════════════════════════════════════════════════════ */

(function initLoadScreen() {
  const screen = document.getElementById('loadScreen');
  if (!screen) return;

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.LOAD_SCREEN) || { MAX_WAIT_MS: 8000, MIN_DISPLAY_MS: 4500 };
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

  /* ── Build the list of real, measurable readiness promises ── */
  const waits = [];

  if (document.fonts && document.fonts.ready) {
    waits.push(document.fonts.ready);
  }

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
  
// Hero avatar opportunistic check (reemplaza la sección anterior)
const avatarEl = document.querySelector('.hero-avatar-wrap');
let avatarPath = null;

if (avatarEl) {
  // 1) data-avatar preferido (útil si el routing inyecta la ruta)
  if (avatarEl.dataset && avatarEl.dataset.avatar) {
    avatarPath = avatarEl.dataset.avatar;
  }

  // 2) <img> dentro del contenedor
  if (!avatarPath) {
    const avatarImg = avatarEl.querySelector('img.hero-avatar-img');
    if (avatarImg && avatarImg.src) avatarPath = avatarImg.src;
  }

  // 3) background-image CSS
  if (!avatarPath) {
    const bg = avatarEl.style.backgroundImage || getComputedStyle(avatarEl).backgroundImage;
    const match = /url\(["']?(.*?)["']?\)/.exec(bg || '');
    if (match && match[1]) avatarPath = match[1];
  }
}

// 4) fallback explícito a la ruta conocida
if (!avatarPath) {
  avatarPath = './images/profile.png';
}

// Evitar placeholders comunes
const isPlaceholder = /YOUR-PHOTO-FILENAME|placeholder|default-avatar/i.test(avatarPath);
if (avatarPath && !isPlaceholder) {
  waits.push(new Promise(resolve => {
    const img = new Image();
    img.src = avatarPath;
    img.onload = img.onerror = () => resolve();
  }));
}
// Esperar todas las promesas y luego ocultar
Promise.all(waits).then(hide).catch(hide);

// Fallback por timeout duro
setTimeout(hide, cfg.MAX_WAIT_MS);
