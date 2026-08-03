/* ══════════════════════════════════════════════════════════
   loadScreen.js (Hardened Version)
   Landing Redesign — Module 4 of 4 (Load Screen)
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
      setTimeout(() => { if (screen.isConnected) screen.remove(); }, 500);
    }, remaining);
  }

  /* ── Helper para evitar que una promesa cuelgue el Promise.all ── */
  function timeoutPromise(promise, ms = 3000) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(), ms);
      promise.then(() => {
        clearTimeout(timer);
        resolve();
      }).catch(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  const waits = [];

  // 1. Fuentes
  if (document.fonts && document.fonts.ready) {
    waits.push(timeoutPromise(document.fonts.ready, 2000));
  }

  // 2. Media del Photo Wall con límite de tiempo individual por archivo
  if (typeof PHOTO_WALL_MEDIA !== 'undefined') {
    const VIDEO_EXT = /\.(webm|mp4)$/i;
    PHOTO_WALL_MEDIA.forEach(path => {
      const p = new Promise(resolve => {
        if (VIDEO_EXT.test(path)) {
          const v = document.createElement('video');
          v.src = path;
          v.onloadedmetadata = v.onerror = () => resolve();
        } else {
          const img = new Image();
          img.src = path;
          img.onload = img.onerror = () => resolve();
        }
      });
      // Cada asset individual tiene máximo 3 segundos para responder, si no, se ignora
      waits.push(timeoutPromise(p, 3000));
    });
  }
  
  // 3. Avatar Opportunistic Check
  const avatarEl = document.querySelector('.hero-avatar-wrap');
  let avatarPath = null;

  if (avatarEl) {
    if (avatarEl.dataset && avatarEl.dataset.avatar) {
      avatarPath = avatarEl.dataset.avatar;
    }
    if (!avatarPath) {
      const avatarImg = avatarEl.querySelector('img.hero-avatar-img');
      if (avatarImg && avatarImg.src) avatarPath = avatarImg.src;
    }
    if (!avatarPath) {
      const bg = avatarEl.style.backgroundImage || getComputedStyle(avatarEl).backgroundImage;
      const match = /url\(["']?(.*?)["']?\)/.exec(bg || '');
      if (match && match[1]) avatarPath = match[1];
    }
  }

  // Si no hay ruta clara, omitimos el avatar en lugar de forzar un archivo que tal vez no exista
  const isPlaceholder = !avatarPath || /YOUR-PHOTO-FILENAME|placeholder|default-avatar/i.test(avatarPath);
  
  if (!isPlaceholder) {
    waits.push(timeoutPromise(new Promise(resolve => {
      const img = new Image();
      img.src = avatarPath;
      img.onload = img.onerror = () => resolve();
    }), 2000));
  }

  // Ejecutar con seguridad absoluta
  Promise.all(waits).then(hide).catch(hide);

  // Fallback por timeout duro global (Garantía absoluta de cierre)
  setTimeout(hide, cfg.MAX_WAIT_MS);
})();
