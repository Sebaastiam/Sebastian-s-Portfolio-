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
  if (isMobile.matches) return;
  const maxDpr = isMobile.matches ? 1.25 : 2;

  let cols = 0, rows = 0, rafId = 0, lastFrame = 0, lastMutation = 0;
  let currentString = C.BASE_STRING;
  const mouse = { x: -999, y: -999 };
  let explosions = [];

  const fps = isMobile.matches ? 24 : 45;
  const frameMs = 1000 / fps;

  function resize() {
    const rect = canvas.getBoundingClientRect();
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
  return panel.classList.contains('open') && !document.hidden;
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
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) y += (10 - dist) * 0.3 * ws.depth;

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
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const dx = x - exp.x, dy = y - exp.y;
          if (Math.sqrt(dx * dx + dy * dy) < exp.radius && Math.random() < C.EXPLOSION_DENSITY) {
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
    explosions.push({
      x: (e.clientX - r.left) / C.CHAR_W,
      y: (e.clientY - r.top) / C.CHAR_H,
      radius: 0,
      life: 1,
    });
  });

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
})();