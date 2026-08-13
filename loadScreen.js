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

  /* ── Helper compartido: precarga una ruta como <img> o <video>
     según extensión, resuelve en load/error, nunca rechaza ── */
  const VIDEO_EXT = /\.(webm|mp4)$/i;
  function preload(path) {
    return new Promise(resolve => {
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
  }

  const waits = [];

  // 1. Fuentes
  if (document.fonts && document.fonts.ready) {
    waits.push(timeoutPromise(document.fonts.ready, 2000));
  }

  // 2. Media del Photo Wall con límite de tiempo individual por archivo
  if (typeof PHOTO_WALL_MEDIA !== 'undefined') {
    PHOTO_WALL_MEDIA.forEach(path => {
      // Cada asset individual tiene máximo 3 segundos para responder, si no, se ignora
      waits.push(timeoutPromise(preload(path), 3000));
    });
  }

  // 2.5 Imágenes/video del Scroll Narrative (Módulo 3).
  // Sin esto, la primera "parada" del scroll narrativo empezaba a pedir
  // background + layers recién cuando el usuario llegaba a ella — justo
  // después de que el load screen se esconde — así que se veía el
  // color-block placeholder (o un pop-in feo) por uno o dos frames.
  // Ahora se precargan junto con el resto ANTES de esconder el load screen,
  // igual que ya se hace con PHOTO_WALL_MEDIA, reutilizando el mismo helper
  // `preload()` (detecta imagen vs video por extensión, igual que
  // scrollNarrative.js hace internamente).
  if (typeof SCROLL_NARRATIVE_CONFIG !== 'undefined') {
    const scrollSrcs = new Set();
    SCROLL_NARRATIVE_CONFIG.forEach(stop => {
      if (stop.background && stop.background.src) scrollSrcs.add(stop.background.src);
      (stop.layers || []).forEach(layer => {
        if (layer.src) scrollSrcs.add(layer.src);
      });
    });

    scrollSrcs.forEach(src => {
      waits.push(timeoutPromise(preload(src), 3000));
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
    waits.push(timeoutPromise(preload(avatarPath), 2000));
  }

  // 4. 3D Model (GLB) — preload via fetch so the model is in the browser
  //    cache before scrollNarrative.js requests it via GLTFLoader.
  //    Without this, the model would start loading only when the user's
  //    scroll reaches revealFrom — causing a visible "pop in" delay.
  //    We use fetch() (not an <img>) because GLB is a binary asset that
  //    the browser won't cache via an image preload tag.
  //    Individual timeout: 5s — GLB files can be large; we don't want
  //    the load screen to wait forever if the model fails to load.
  if (typeof SCROLL_NARRATIVE_CONFIG !== 'undefined') {
    SCROLL_NARRATIVE_CONFIG.forEach(stop => {
      if (stop.model && stop.model.src) {
        const glbPromise = fetch(stop.model.src, { priority: 'low' })
          .then(r => { if (!r.ok) throw new Error(r.status); })
          .catch(() => {}); /* never block hiding on model failure */
        waits.push(timeoutPromise(glbPromise, 5000));
      }
    });
  }

  // ── Progress bar + percentage — real asset tracking ──────────────────
  // Each promise in waits[] is wrapped so that when it settles (resolve or
  // timeout), it ticks a counter and updates the bar/label in real time.
  // This wrapping happens AFTER all waits[] entries are pushed, so the
  // total count is known before any promise has a chance to settle.
  // The bar drives from 0 → 92% while assets load, then jumps to 100%
  // right before the screen fades — so the user always sees completion.

  const barEl   = document.getElementById('loadBar');
  const pctEl   = document.getElementById('loadPct');

  function setProgress(pct) {
    const p = Math.min(100, Math.round(pct));
    if (barEl) barEl.style.setProperty('--load-pct', p + '%');
    if (pctEl) pctEl.textContent = p + '%';
  }

  function trackProgress(promises) {
    if (!promises.length) return promises;
    let done = 0;
    const total = promises.length;
    setProgress(0);
    return promises.map(p =>
      p.then(v => { setProgress((++done / total) * 92); return v; },
             v => { setProgress((++done / total) * 92); return v; })
    );
  }

  // Wire progress tracking, then run
  const tracked = trackProgress(waits);

  Promise.all(tracked).then(() => {
    setProgress(100); /* flash to 100% before fade */
    hide();
  }).catch(hide);

  // Fallback por timeout duro global (Garantía absoluta de cierre)
  setTimeout(hide, cfg.MAX_WAIT_MS);
})();
