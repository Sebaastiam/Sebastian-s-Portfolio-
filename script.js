/* ── Slideshow + Ken Burns ── */
(function () {
  const slides  = Array.from(document.querySelectorAll('.bg-slide'));
  const bgImgs  = Array.from(document.querySelectorAll('.bg-img'));
  const animSeq = ['panRight','panLeft','zoomIn','panRight','panLeft','zoomOut','panUp'];
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