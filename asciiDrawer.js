/* ══════════════════════════════════════════════════
   asciiDrawer.js — ASCII dynamic background
   Sebastián Castillo Portfolio — v1.3.2
   Scoped to #ascii-bg inside #morePanel.
   Depends on: config.js (CONFIG.ASCII)
   ══════════════════════════════════════════════════ */

(function initAsciiDrawer() {
  const canvas = document.getElementById('ascii-bg');
  const panel = document.getElementById('morePanel');
  if (!canvas || !panel) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const C = CONFIG.ASCII;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 768px)');
  /* NOTE (Milestone 3 fix #1): a hard "if (isMobile.matches) return;"
     previously lived here, checked once at script load. Two bugs
     resulted: (a) load on mobile, resize/rotate to desktop — the
     module had already exited, so it could never activate; (b) load
     on desktop, resize to mobile — nothing re-checked, so the rAF
     loop kept drawing into a canvas the CSS had already hidden.
     Fixed below by checking isMobile.matches LIVE inside isActive()
     (called every frame + every start attempt) instead of once here.
     Bonus finding: the old early return also meant the mobile-only
     branches of maxDpr/fps a few lines down could never actually be
     reached even in the original code — the return fired before
     execution ever got to them. Left as-is (harmless, and changing
     that behavior wasn't asked for) but noting it since it only
     became visible while implementing this fix. */

  let cols = 0, rows = 0, rafId = 0, lastFrame = 0, lastMutation = 0;
  let currentString = C.BASE_STRING;
  const mouse = { x: -999, y: -999 };
  let explosions = [];

  const fps = isMobile.matches ? 24 : 45;
  const frameMs = 1000 / fps;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const maxDpr = isMobile.matches ? 1.25 : 2; /* live, not load-time cached (Milestone 3 fix #1) */
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${C.CHAR_H}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#00ff9f';
    cols = Math.floor(rect.width / C.CHAR_W);
    rows = Math.floor(rect.height / C.CHAR_H);
  }

  const mutations = [
    s => s.split('').reverse().join(''),
    s => s.replace(/O/g, '0'),
    s => s.replace(/E/g, '3'),
    s => s.slice(0, Math.max(1, Math.floor(Math.random() * s.length))),
    s => s + '_ERR',
  ];

  function mutateString() {
    currentString = mutations[Math.floor(Math.random() * mutations.length)](currentString);
    if (currentString.length < 2) currentString = C.BASE_STRING;
  }

  const waveStrings = Array.from({ length: C.TOTAL_STRINGS }, (_, i) => ({
    index: i,
    amplitude: 2 + (0.6 + Math.random() * 0.8) * 4,
    wavelength: 0.08,
    speed: (0.6 + Math.random() * 0.8) * 0.002,
    offset: Math.random() * 100,
    depth: 0.6 + Math.random() * 0.8,
  }));

  function isActive() {
    /* isMobile.matches and reduceMotion.matches are read live here
       (Milestone 3 fixes #1, #2) rather than cached once at load —
       since this function runs every frame (via draw()) and on every
       start() attempt, both the viewport-breakpoint and OS-level
       reduced-motion preference are effectively re-checked
       continuously, with no extra listeners needed. */
    return panel.classList.contains('open')
      && !document.hidden
      && !isMobile.matches
      && !reduceMotion.matches;
  }

  function draw(time) {
    if (!isActive()) {
      rafId = 0;
      return;
    }

    if (time - lastFrame < frameMs) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    lastFrame = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    waveStrings.forEach(ws => {
      for (let x = 0; x < cols; x++) {
        const baseY = (ws.index / C.TOTAL_STRINGS) * rows;
        let y = baseY
          + Math.sin(x * ws.wavelength + time * ws.speed + ws.offset) * ws.amplitude
          + Math.sin(x * 0.04 + time * 0.0015) * (ws.amplitude * 0.5);

        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 100) { /* was Math.sqrt(...) < 10 — squared comparison avoids sqrt for the common (outside-radius) case, called up to TOTAL_STRINGS × cols times per frame */
          const dist = Math.sqrt(distSq);
          y += (10 - dist) * 0.3 * ws.depth;
        }

        const row = Math.floor(y);
        if (row >= 0 && row < rows) {
          const charIndex = (x + Math.floor(time * 0.01)) % currentString.length;
          const char = Math.random() < 0.02 ? '#' : currentString[charIndex];
          ctx.fillText(char, x * C.CHAR_W, row * C.CHAR_H);
        }
      }
    });

    explosions.forEach(exp => {
      exp.radius += C.EXPLOSION_SPEED;
      exp.life -= C.EXPLOSION_DECAY;
      /* Fix #3 (Milestone 3): iterate only the bounding box around
         the explosion's current radius instead of the full rows×cols
         grid — early in an explosion's life exp.radius is small, so
         scanning the whole canvas to find a handful of nearby cells
         was wasted work. Same visual result, bounded cost. */
      const rSq = exp.radius * exp.radius;
      const yMin = Math.max(0, Math.floor(exp.y - exp.radius));
      const yMax = Math.min(rows - 1, Math.ceil(exp.y + exp.radius));
      const xMin = Math.max(0, Math.floor(exp.x - exp.radius));
      const xMax = Math.min(cols - 1, Math.ceil(exp.x + exp.radius));
      for (let y = yMin; y <= yMax; y++) {
        for (let x = xMin; x <= xMax; x++) {
          const dx = x - exp.x, dy = y - exp.y;
          if ((dx * dx + dy * dy) < rSq && Math.random() < C.EXPLOSION_DENSITY) {
            ctx.fillText('@', x * C.CHAR_W, y * C.CHAR_H);
          }
        }
      }
    });
    explosions = explosions.filter(e => e.life > 0);

    if (time - lastMutation > C.MUTATION_INTERVAL_MS) {
      mutateString();
      lastMutation = time;
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
  if (!isActive() || rafId) return;
  resize();
  lastFrame = 0;
  rafId = requestAnimationFrame(draw);
}

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  new ResizeObserver(() => {
  resize();
  if (panel.classList.contains('open')) start();
}).observe(panel);
  new MutationObserver(() => panel.classList.contains('open') ? start() : stop())
    .observe(panel, { attributes: true, attributeFilter: ['class'] });

  panel.addEventListener('pointermove', e => {
    const r = panel.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / C.CHAR_W;
    mouse.y = (e.clientY - r.top) / C.CHAR_H;
  }, { passive: true });

  panel.addEventListener('click', e => {
    const r = panel.getBoundingClientRect();
    if (explosions.length >= C.MAX_SIMULTANEOUS) explosions.shift(); /* Milestone 3 fix #3 companion — drop oldest rather than grow unbounded under rapid clicking */
    explosions.push({
      x: (e.clientX - r.left) / C.CHAR_W,
      y: (e.clientY - r.top) / C.CHAR_H,
      radius: 0,
      life: 1,
    });
  });

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
})();
