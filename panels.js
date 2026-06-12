/* ══════════════════════════════════════════════════
   panels.js — All panel transitions, gradient mouse
   tracking, scroll hint, contact modal (with full
   validation + focus trap), and more/visual-archive
   panel with lazy Vimeo.
   Depends on: config.js (CONFIG)
   ══════════════════════════════════════════════════ */


/* ── 1. Glass card panel transitions ────────────── */
(function initCardPanels() {
  const defaultView = document.getElementById('defaultView');
  const btnPanel    = document.getElementById('btnPanel');
  const backBtn     = document.getElementById('backBtn');
  const actionBtn   = document.getElementById('actionBtn');
  if (!defaultView || !btnPanel || !backBtn || !actionBtn) return;

  function showPanel() {
    defaultView.classList.add('fade-out');
    defaultView.addEventListener('animationend', () => {
      defaultView.style.display = 'none';
      defaultView.classList.remove('fade-out');
      btnPanel.style.display    = 'flex';
      backBtn.style.display     = 'block';
      btnPanel.classList.add('fade-in');
      btnPanel.addEventListener('animationend', () => {
        btnPanel.style.opacity = '1';
        btnPanel.classList.remove('fade-in');
      }, { once: true });
    }, { once: true });
  }

  function showDefault() {
    btnPanel.classList.add('fade-out');
    btnPanel.addEventListener('animationend', () => {
      btnPanel.style.display  = 'none';
      btnPanel.style.opacity  = '0';
      btnPanel.classList.remove('fade-out');
      backBtn.style.display   = 'none';
      defaultView.style.display = 'flex';
      defaultView.classList.add('fade-in');
      defaultView.addEventListener('animationend', () => {
        defaultView.classList.remove('fade-in');
      }, { once: true });
    }, { once: true });
  }

  actionBtn.addEventListener('click', e => { e.currentTarget.blur(); showPanel(); });
  backBtn.addEventListener('click',   e => { e.currentTarget.blur(); showDefault(); });
})();


/* ── 2. oklch gradient — mouse/touch tracking ───── */
(function initGradientTracking() {
  const targets = [
    document.getElementById('moduleTitle'),
    document.querySelector('.contact-prompt'),
    document.querySelector('.contact-pill-label'),
    document.getElementById('cmodalTitle'),
  ].filter(Boolean);

  let targetX = 50, targetY = 50;
  let currentX = 50, currentY = 50;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    currentX = lerp(currentX, targetX, CONFIG.GRADIENT_LERP);
    currentY = lerp(currentY, targetY, CONFIG.GRADIENT_LERP);
    const gx = currentX.toFixed(2) + '%';
    const gy = currentY.toFixed(2) + '%';
    targets.forEach(el => {
      el.style.setProperty('--gx', gx);
      el.style.setProperty('--gy', gy);
    });
    requestAnimationFrame(tick);
  }

  function update(clientX, clientY) {
    targetX = (clientX / window.innerWidth)  * 100;
    targetY = (clientY / window.innerHeight) * 100;
  }

  document.addEventListener('pointermove', e => update(e.clientX, e.clientY));
  document.addEventListener('touchmove',
    e => update(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true }
  );

  tick();
})();


/* ── 3. Scroll hint auto-hide ───────────────────── */
(function initScrollHint() {
  const hint = document.getElementById('scrollHint');
  if (!hint) return;
  window.addEventListener('scroll', () => {
    hint.classList.toggle('hidden', window.scrollY > 55);
  }, { passive: true });
})();


/* ── 4. Focus-trap utility ──────────────────────── */
function createFocusTrap(containerEl) {
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  function getFocusable() {
    return Array.from(containerEl.querySelectorAll(FOCUSABLE))
                .filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none');
  }

  function trap(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  return {
    activate() {
      containerEl.addEventListener('keydown', trap);
    },
    deactivate() {
      containerEl.removeEventListener('keydown', trap);
    },
    focusFirst() {
      const focusable = getFocusable();
      if (focusable.length) focusable[0].focus();
    },
  };
}


/* ── 5. Form validation helpers ─────────────────── */
const VALIDATION = CONFIG.VALIDATION;

function validateField(input) {
  const name  = input.name;
  const value = input.value.trim();
  let error   = '';

  if (name === 'nombre') {
    if (!value) {
      error = 'El nombre es requerido.';
    } else if (value.length < VALIDATION.NAME_MIN_LENGTH) {
      error = `Mínimo ${VALIDATION.NAME_MIN_LENGTH} caracteres.`;
    }
  } else if (name === 'email') {
    if (!value) {
      error = 'El email es requerido.';
    } else if (!VALIDATION.EMAIL_REGEX.test(value)) {
      error = 'Ingresa un email válido.';
    }
  } else if (name === 'mensaje') {
    if (!value) {
      error = 'El mensaje es requerido.';
    } else if (value.length < VALIDATION.MESSAGE_MIN_LENGTH) {
      error = `Mínimo ${VALIDATION.MESSAGE_MIN_LENGTH} caracteres.`;
    }
  }

  return error;
}

/* Mark a field valid or invalid with visual feedback */
function setFieldState(input, error) {
  const isInvalid = Boolean(error);
  input.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');

  /* Remove previous error message */
  const existingMsg = document.getElementById('err-' + input.name);
  if (existingMsg) existingMsg.remove();

  if (isInvalid) {
    input.classList.add('input--invalid');
    input.classList.remove('input--valid');
    /* Shake animation */
    input.classList.remove('input--shake');
    void input.offsetWidth;
    input.classList.add('input--shake');
    input.addEventListener('animationend', () => input.classList.remove('input--shake'), { once: true });

    /* Screen-reader error message */
    const msg = document.createElement('span');
    msg.id          = 'err-' + input.name;
    msg.className   = 'sr-only input-error-msg';
    msg.setAttribute('role', 'alert');
    msg.textContent = error;
    input.insertAdjacentElement('afterend', msg);
  } else {
    input.classList.remove('input--invalid');
    input.classList.add('input--valid');
  }

  return !isInvalid;
}

/* Validate all form fields; return true if all pass */
function validateForm(form) {
  const inputs = Array.from(form.querySelectorAll('.cmodal-input'));
  return inputs.reduce((allValid, input) => {
    const error = validateField(input);
    return setFieldState(input, error) && allValid;
  }, true);
}


/* ── 6. Contact modal ───────────────────────────── */
(function initContactModal() {
  const wrap    = document.getElementById('contactModal');
  const overlay = document.getElementById('cmodalOverlay');
  const trigger = document.getElementById('contactTrigger');
  const closeBtn= document.getElementById('cmodalClose');
  const form    = document.getElementById('cmodalForm');
  const success = document.getElementById('cmodalSuccess');
  const panel   = wrap?.querySelector('.cmodal-panel');
  if (!wrap || !form) return;

  const trap = createFocusTrap(wrap);
  let previousFocus = null;

  /* Live validation on blur */
  form.querySelectorAll('.cmodal-input').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim()) { /* only validate once touched */
        const error = validateField(input);
        setFieldState(input, error);
      }
    });
    /* Clear invalid state on input once the user starts fixing it */
    input.addEventListener('input', () => {
      if (input.classList.contains('input--invalid')) {
        const error = validateField(input);
        setFieldState(input, error);
      }
    });
  });

  function open() {
    previousFocus = document.activeElement;
    wrap.classList.add('open');
    wrap.removeAttribute('aria-hidden');
    document.documentElement.style.overflowY = 'hidden';
    trap.activate();
    /* Delay focus slightly to allow CSS transition */
    requestAnimationFrame(() => {
      if (closeBtn) closeBtn.focus();
    });
  }

  function shut() {
    wrap.classList.remove('open');
    wrap.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflowY = '';
    trap.deactivate();
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  if (trigger) {
    trigger.addEventListener('click',   open);
    trigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  }
  if (overlay) overlay.addEventListener('click', shut);
  if (closeBtn) closeBtn.addEventListener('click', shut);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) shut();
  });

  /* Form submit with validation */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!validateForm(form)) {
      /* Focus first invalid field */
      const firstInvalid = form.querySelector('.input--invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const formData = new FormData();
    formData.append('nombre',  form.nombre.value.trim());
    formData.append('email',   form.email.value.trim());
    formData.append('mensaje', form.mensaje.value.trim());

    try {
      await fetch(CONFIG.FORM_ENDPOINT, {
        method: 'POST',
        mode:   'no-cors',
        body:   formData,
      });

      form.style.display    = 'none';
      success.style.display = 'block';

      setTimeout(() => {
        shut();
        setTimeout(() => {
          form.style.display    = 'flex';
          success.style.display = 'none';
          form.reset();
          /* Clear all validation states on reset */
          form.querySelectorAll('.cmodal-input').forEach(input => {
            input.classList.remove('input--invalid', 'input--valid');
            input.removeAttribute('aria-invalid');
          });
        }, CONFIG.MODAL_RESET_DELAY_MS);
      }, CONFIG.SUCCESS_DISPLAY_MS);

    } catch (err) {
      console.error('[contact form]', err);
      /* Show user-facing error without alert() */
      const errBanner = document.createElement('p');
      errBanner.setAttribute('role', 'alert');
      errBanner.className   = 'cmodal-send-error';
      errBanner.textContent = 'Error al enviar. Intenta de nuevo.';
      form.appendChild(errBanner);
      setTimeout(() => errBanner.remove(), 4000);
    }
  });
})();


/* ── 7. More / Visual-archive panel ─────────────── */
(function initMorePanel() {
  const trigger  = document.getElementById('moreTrigger');
  const panel    = document.getElementById('morePanel');
  const closeBtn = document.getElementById('moreClose');
  if (!trigger || !panel) return;

  const trap = createFocusTrap(panel);
  let vimeoLoaded = false;
  let previousFocus = null;

  function openPanel() {
    previousFocus = document.activeElement;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('more-open');
    trap.activate();
    requestAnimationFrame(() => { if (closeBtn) closeBtn.focus(); });

    /* Lazy-load Vimeo iframe first time */
    if (!vimeoLoaded) {
      vimeoLoaded = true;
      const wrap = document.getElementById('feedVimeoWrap');
      if (wrap) {
        const iframe = document.createElement('iframe');
        iframe.src              = CONFIG.VIMEO_SRC;
        iframe.frameBorder      = '0';
        iframe.allow            = 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share';
        iframe.referrerPolicy   = 'strict-origin-when-cross-origin';
        iframe.style.cssText    = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        iframe.title            = CONFIG.VIMEO_TITLE;
        wrap.appendChild(iframe);
      }
    }
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('more-open');
    trap.deactivate();
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  function togglePanel() {
    panel.classList.contains('open') ? closePanel() : openPanel();
  }

  trigger.addEventListener('click', togglePanel);
  closeBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });
})();
