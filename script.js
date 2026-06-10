/* ── Slideshow + Ken Burns ── */
(function () {
  const slides  = Array.from(document.querySelectorAll('.bg-slide'));
  const bgImgs  = Array.from(document.querySelectorAll('.bg-img'));
  const animSeq = ['panLeft','panUp','panUp','panDown','panRight','zoomOut','panRight','panDown'];
  let current = 0, started = false;
  function applyAnim(i) {
    const img = bgImgs[i];
    img.className = 'bg-img';
    void img.offsetWidth;
    img.classList.add('anim-' + animSeq[i]);
  }
  applyAnim(0);
  let ready = 0;
  const fallback = setTimeout(boot, 2500);
  bgImgs.forEach(img => {
    const url = img.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
    const el  = new Image();
    el.src    = url;
    el.onload = el.onerror = () => { if (++ready === bgImgs.length) boot(); };
  });
  function boot() {
    if (started) return; started = true; clearTimeout(fallback);
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      applyAnim(current);
      slides[current].classList.add('active');
    }, 4000);
  }
})();

/* ── Card dragging ── */
(function () {
  const el = document.getElementById('glassModule');
  if (!el) return;
  let ox = 0, oy = 0, dragging = false;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function onDown(e) {
    if (e.target.closest('button,a,input,textarea,select')) return;
    e.preventDefault();
    dragging = true; el.classList.add('dragging');
    const r = el.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
  }
  function onMove(e) {
    if (!dragging) return;
    el.style.left = clamp(e.clientX - ox, 8, window.innerWidth  - el.offsetWidth  - 8) + 'px';
    el.style.top  = clamp(e.clientY - oy, 8, window.innerHeight - el.offsetHeight - 8) + 'px';
  }
  function onUp() {
    dragging = false; el.classList.remove('dragging');
    document.removeEventListener('pointermove', onMove);
  }
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('button,a,input,textarea,select')) return;
    el.classList.add('touch-tap');
    setTimeout(() => el.classList.remove('touch-tap'), 160);
  });
  el.addEventListener('pointerenter', () => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'bounceIn 900ms linear both'; });
  el.addEventListener('pointerleave', () => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'bounceOut 700ms linear both'; });
  window.addEventListener('resize', () => {
    const r = el.getBoundingClientRect();
    el.style.left = clamp(r.left, 8, window.innerWidth  - el.offsetWidth  - 8) + 'px';
    el.style.top  = clamp(r.top,  8, window.innerHeight - el.offsetHeight - 8) + 'px';
  });
})();

/* ── Panel transitions ── */
function showPanel() {
  const dv = document.getElementById('defaultView');
  const bp = document.getElementById('btnPanel');
  const bk = document.getElementById('backBtn');
  dv.classList.add('fade-out');
  dv.addEventListener('animationend', () => {
    dv.style.display = 'none'; dv.classList.remove('fade-out');
    bp.style.display = 'flex'; bk.style.display = 'block';
    bp.classList.add('fade-in');
    bp.addEventListener('animationend', () => { bp.style.opacity = '1'; bp.classList.remove('fade-in'); }, { once: true });
  }, { once: true });
}
function showDefault() {
  const dv = document.getElementById('defaultView');
  const bp = document.getElementById('btnPanel');
  const bk = document.getElementById('backBtn');
  bp.classList.add('fade-out');
  bp.addEventListener('animationend', () => {
    bp.style.display = 'none'; bp.style.opacity = '0';
    bp.classList.remove('fade-out'); bk.style.display = 'none';
    dv.style.display = 'flex';
    dv.classList.add('fade-in');
    dv.addEventListener('animationend', () => { dv.classList.remove('fade-in'); }, { once: true });
  }, { once: true });
}
document.getElementById('actionBtn').addEventListener('click', e => { e.currentTarget.blur(); showPanel(); });
document.getElementById('backBtn').addEventListener('click',   e => { e.currentTarget.blur(); showDefault(); });

/* ── oklch gradient mouse/touch tracking ── */
(function () {
  const els = [
    document.getElementById('moduleTitle'),
    document.querySelector('.contact-prompt'),
    document.querySelector('.contact-pill-label'),
    document.getElementById('cmodalTitle')
  ].filter(Boolean);

  let tX = 50, tY = 50;
  let cX = 50, cY = 50;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    cX = lerp(cX, tX, 0.055);
    cY = lerp(cY, tY, 0.055);

    const gx = cX.toFixed(2) + '%';
    const gy = cY.toFixed(2) + '%';

    els.forEach(el => {
      el.style.setProperty('--gx', gx);
      el.style.setProperty('--gy', gy);
    });

    requestAnimationFrame(tick);
  }

  function update(clientX, clientY) {
    // Interactive mouse movement updates the center of the gradient
    tX = (clientX / window.innerWidth) * 100;
    tY = (clientY / window.innerHeight) * 100;
  }

  document.addEventListener('pointermove', e => update(e.clientX, e.clientY));
  document.addEventListener('touchmove',
    e => update(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true }
  );

  tick();
})();

/* ── Scroll hint auto-hide ── */
(function () {
  const hint = document.getElementById('scrollHint');
  if (!hint) return;
  window.addEventListener('scroll', () => {
    hint.classList.toggle('hidden', window.scrollY > 55);
  }, { passive: true });
})();

/* ── Contact modal open / close / submit ── */
(function () {
  const wrap    = document.getElementById('contactModal');
  const overlay = document.getElementById('cmodalOverlay');
  const trigger = document.getElementById('contactTrigger');
  const close   = document.getElementById('cmodalClose');
  const form    = document.getElementById('cmodalForm');
  const success = document.getElementById('cmodalSuccess');

  function open()  { wrap.classList.add('open');    document.documentElement.style.overflowY = 'hidden'; }
  function shut()  { wrap.classList.remove('open'); document.documentElement.style.overflowY = ''; }

  if (trigger) {
    trigger.addEventListener('click',   open);
    trigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  }
  if (overlay) overlay.addEventListener('click',   shut);
  if (close) close.addEventListener('click',     shut);

  // Close on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap.classList.contains('open')) shut(); });

  if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const formData = new FormData();

    formData.append('nombre', form.nombre.value);
    formData.append('email', form.email.value);
    formData.append('mensaje', form.mensaje.value);

    try {

      await fetch(
        'https://script.google.com/macros/s/AKfycbxpnQ42VMCpVnSakwY-JplaqeSFsjRB4s1U6_eWmSoa2K1tV_7dpvUfFbNWsuXU3HqbcQ/exec',
        {
          method: 'POST',
          mode: 'no-cors',
          body: formData
        }
      );

      form.style.display = 'none';
      success.style.display = 'block';

      setTimeout(() => {
        shut();

        setTimeout(() => {
          form.style.display = 'flex';
          success.style.display = 'none';
          form.reset();
        }, 350);

      }, 2400);

    } catch (error) {
      console.error(error);
      alert('Error al enviar el mensaje.');
    }
  });
}
})();

/* ── More panel floating windows ── */
(function () {
  const trigger = document.getElementById('moreTrigger');
  const panel = document.getElementById('morePanel');
  const close = document.getElementById('moreClose');
  if (!trigger || !panel) return;

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('more-open');
    close?.focus();
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('more-open');
    trigger.focus();
  }

  function togglePanel() {
    if (panel.classList.contains('open')) {
      closePanel();
    } else {
      openPanel();
    }
  }

  trigger.addEventListener('click', togglePanel);
  close?.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });
})();

/* ── ASCII drawer background — self-contained IIFE ── */
(function () {
  const asciiEl = document.getElementById('ascii-bg');
  const panel   = document.getElementById('morePanel');
  if (!asciiEl || !panel) return;

  let cols, rows;

  function resize() {
    const rect = asciiEl.getBoundingClientRect();
    const w = rect.width  || panel.offsetWidth  || window.innerWidth;
    const h = rect.height || panel.offsetHeight || window.innerHeight;
    cols = Math.floor(w  / 7);
    rows = Math.floor(h  / 12);
  }

  // recalc on window resize and whenever panel opens
  window.addEventListener('resize', resize);
  const openObserver = new MutationObserver(() => {
    if (panel.classList.contains('open')) {
      resize();
      if (!animating) { animating = true; requestAnimationFrame(draw); }
    }
  });
  openObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });

  resize();

  /* Mouse — relative to the drawer panel */
  let mouse = { x: 0, y: 0 };
  panel.addEventListener('pointermove', (e) => {
    const r = panel.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / 7;
    mouse.y = (e.clientY - r.top)  / 12;
  });

  /* Click explosions — relative to drawer */
  let explosions = [];
  panel.addEventListener('click', (e) => {
    const r = panel.getBoundingClientRect();
    explosions.push({
      x:      (e.clientX - r.left) / 7,
      y:      (e.clientY - r.top)  / 12,
      radius: 0,
      life:   1
    });
  });

  /* Mutating string */
  let baseString    = 'ruZ_Esc';
  let currentString = baseString;
  const mutations = [
    (s) => s.split('').reverse().join(''),
    (s) => s.replace(/O/g, '0'),
    (s) => s.replace(/E/g, '3'),
    (s) => s.slice(0, Math.max(1, Math.floor(Math.random() * s.length))),
    (s) => s + '_ERR',
  ];
  function mutateString() {
    const fn = mutations[Math.floor(Math.random() * mutations.length)];
    currentString = fn(currentString);
    if (currentString.length < 2) currentString = baseString;
  }

  /* Wave strings */
  class CursedString {
    constructor(index, total, depth) {
      this.index     = index;
      this.total     = total;
      this.depth     = depth;
      this.baseY     = (index / total) * rows;
      this.amplitude = 2 + depth * 4;
      this.wavelength= 0.08;
      this.speed     = 0.0 + depth * 0.002;
      this.offset    = Math.random() * 100;
    }
    update(time) { this.time = time; }
    getY(x) {
      let y = this.baseY +
        Math.sin(x * this.wavelength + this.time * this.speed + this.offset) * this.amplitude;
      y += Math.sin(x * 0.04 + this.time * 0.0015) * (this.amplitude * 0.5);
      const dx = x - mouse.x, dy = y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) y += (10 - dist) * 0.3 * this.depth;
      return Math.floor(y);
    }
  }

  let strings = [];
  function createStrings() {
    strings = [];
    const total = 22;
    for (let i = 0; i < total; i++) {
      strings.push(new CursedString(i, total, 0.6 + Math.random() * 0.8));
    }
  }
  createStrings();

  /* Render */
  let lastMutation = 0;
  let animating    = false;

  function draw(time) {
    if (!panel.classList.contains('open')) { animating = false; return; }

    const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));

    strings.forEach((s) => {
      s.update(time);
      for (let x = 0; x < cols; x++) {
        const y = s.getY(x);
        if (y >= 0 && y < rows) {
          let charIndex = (x + Math.floor(time * 0.01)) % currentString.length;
          let char = currentString[charIndex];
          if (Math.random() < 0.02) char = '#';
          grid[y][x] = char;
        }
      }
    });

    explosions.forEach((exp) => {
      exp.radius += 0.3;
      exp.life   -= 0.015;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const dx = x - exp.x, dy = y - exp.y;
          if (Math.sqrt(dx * dx + dy * dy) < exp.radius && Math.random() < 0.25) {
            grid[y][x] = '@';
          }
        }
      }
    });
    explosions = explosions.filter(e => e.life > 0);

    asciiEl.textContent = grid.map(r => r.join('')).join('\n');

    if (time - lastMutation > 2500) { mutateString(); lastMutation = time; }

    requestAnimationFrame(draw);
  }
})();
