/* ══════════════════════════════════════════════════
   asciiDrawer.js — ASCII dynamic background
   Scoped to #ascii-bg inside #morePanel.
   Depends on: config.js (CONFIG.ASCII)
   ══════════════════════════════════════════════════ */

(function initAsciiDrawer() {
  const asciiEl = document.getElementById('ascii-bg');
  const panel   = document.getElementById('morePanel');
  if (!asciiEl || !panel) return;

  const C = CONFIG.ASCII;

  let cols, rows;
  let animating = false;

  /* ── Grid dimensions ── */
  function resize() {
    const rect = asciiEl.getBoundingClientRect();
    const w = rect.width  || panel.offsetWidth  || window.innerWidth;
    const h = rect.height || panel.offsetHeight || window.innerHeight;
    cols = Math.floor(w / C.CHAR_W);
    rows = Math.floor(h / C.CHAR_H);
  }

  window.addEventListener('resize', resize);

  /* Start animation when panel opens */
  const openObserver = new MutationObserver(() => {
    if (panel.classList.contains('open')) {
      resize();
      if (!animating) { animating = true; requestAnimationFrame(draw); }
    }
  });
  openObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });

  resize();

  /* ── Mouse position relative to panel ── */
  const mouse = { x: 0, y: 0 };
  panel.addEventListener('pointermove', e => {
    const r = panel.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / C.CHAR_W;
    mouse.y = (e.clientY - r.top)  / C.CHAR_H;
  });

  /* ── Click explosions ── */
  let explosions = [];
  panel.addEventListener('click', e => {
    const r = panel.getBoundingClientRect();
    explosions.push({
      x:      (e.clientX - r.left) / C.CHAR_W,
      y:      (e.clientY - r.top)  / C.CHAR_H,
      radius: 0,
      life:   1,
    });
  });

  /* ── Mutating string ── */
  let currentString = C.BASE_STRING;

  const mutations = [
    s => s.split('').reverse().join(''),
    s => s.replace(/O/g, '0'),
    s => s.replace(/E/g, '3'),
    s => s.slice(0, Math.max(1, Math.floor(Math.random() * s.length))),
    s => s + '_ERR',
  ];

  function mutateString() {
    const fn = mutations[Math.floor(Math.random() * mutations.length)];
    currentString = fn(currentString);
    if (currentString.length < 2) currentString = C.BASE_STRING;
  }

  /* ── Wave strings ── */
  class WaveString {
    constructor(index, total, depth) {
      this.index      = index;
      this.baseY      = (index / total) * rows; /* recalculated on draw */
      this.amplitude  = 2 + depth * 4;
      this.wavelength = 0.08;
      this.speed      = 0.0 + depth * 0.002;
      this.offset     = Math.random() * 100;
      this.depth      = depth;
      this.time       = 0;
    }

    update(time) { this.time = time; }

    getY(x) {
      /* Recompute baseY in case rows changed after resize */
      const baseY = (this.index / C.TOTAL_STRINGS) * rows;

      let y = baseY
        + Math.sin(x * this.wavelength + this.time * this.speed + this.offset) * this.amplitude
        + Math.sin(x * 0.04 + this.time * 0.0015) * (this.amplitude * 0.5);

      /* Mouse repulsion */
      const dx = x - mouse.x, dy = y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) y += (10 - dist) * 0.3 * this.depth;

      return Math.floor(y);
    }
  }

  /* Build wave string instances */
  const waveStrings = Array.from({ length: C.TOTAL_STRINGS }, (_, i) =>
    new WaveString(i, C.TOTAL_STRINGS, 0.6 + Math.random() * 0.8)
  );

  /* ── Render loop ── */
  let lastMutation = 0;

  function draw(time) {
    if (!panel.classList.contains('open')) { animating = false; return; }

    const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));

    /* Paint wave strings */
    waveStrings.forEach(ws => {
      ws.update(time);
      for (let x = 0; x < cols; x++) {
        const y = ws.getY(x);
        if (y >= 0 && y < rows) {
          let charIndex = (x + Math.floor(time * 0.01)) % currentString.length;
          let char = currentString[charIndex];
          if (Math.random() < 0.02) char = '#'; /* random glitch char */
          grid[y][x] = char;
        }
      }
    });

    /* Paint explosions */
    explosions.forEach(exp => {
      exp.radius += C.EXPLOSION_SPEED;
      exp.life   -= C.EXPLOSION_DECAY;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const dx = x - exp.x, dy = y - exp.y;
          if (Math.sqrt(dx * dx + dy * dy) < exp.radius && Math.random() < C.EXPLOSION_DENSITY) {
            grid[y][x] = '@';
          }
        }
      }
    });
    explosions = explosions.filter(e => e.life > 0);

    asciiEl.textContent = grid.map(row => row.join('')).join('\n');

    if (time - lastMutation > C.MUTATION_INTERVAL_MS) {
      mutateString();
      lastMutation = time;
    }

    requestAnimationFrame(draw);
  }
})();
