/* ══════════════════════════════════════════════════
   config.js — Centralised constants & endpoints
   Portfolio Sebastián Castillo — v1.3.2
   ══════════════════════════════════════════════════ */

const CONFIG = Object.freeze({

  /* ── Site metadata ──
     Single source of truth for the version string. Previously this
     lived hardcoded in 3 disagreeing places: the visible watermark
     ("SITE V: 1.0"), and the header comments of config.js and
     historyManager.js (both said "v1.3.2"). Bump this value on
     release instead of hand-editing multiple files. */
  SITE_VERSION: '1.4.0',

  /* ── Google Apps Script endpoint for contact form ──
     SECURITY NOTE: this URL is necessarily public (the browser must call
     it directly). The honeypot + timing fields sent from panels.js only
     work if doPost() in the Apps Script project also checks them — see
     the snippet in the project README / chat history for the exact code
     to paste in. Without that server-side check, anyone can bypass the
     client JS entirely and POST straight to this URL. */
  FORM_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxpnQ42VMCpVnSakwY-JplaqeSFsjRB4s1U6_eWmSoa2K1tV_7dpvUfFbNWsuXU3HqbcQ/exec',

  /* ── Slideshow ── */
  /*SLIDE_INTERVAL_MS: 4000,
  SLIDE_FALLBACK_MS: 2500,*/

  /* ── Ken Burns animation sequence (one entry per slide, in order) ── */
  /*SLIDE_ANIM_SEQ: ['panLeft', 'panUp', 'none', 'panUp', 'panRight', 'panDown', 'panRight', 'none'],*/

  /* ── Load screen (Landing Redesign Module 4) ──
     MAX_WAIT_MS: hard fallback — never blocks the visitor past this,
     regardless of what's still loading. Same role as SLIDE_FALLBACK_MS.
     MIN_DISPLAY_MS: floor so the load screen never flash-vanishes on
     a fast connection, which reads as a glitch rather than a good sign. */
  LOAD_SCREEN: {
    MAX_WAIT_MS: 4000,
    MIN_DISPLAY_MS: 500,
  },

  /* ── Vimeo embed ── */
  VIMEO_SRC: 'https://player.vimeo.com/video/1200016508?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1',
  VIMEO_TITLE: 'LA ESCUELA NOCTURNA REMAKE',

  /* ── oklch gradient lerp speed ── */
  GRADIENT_LERP: 0.055,

  /* ── Contact modal success auto-close (ms) ── */
  SUCCESS_DISPLAY_MS: 2400,
  MODAL_RESET_DELAY_MS: 350,

  /* ── Form validation ── */
  VALIDATION: {
    NAME_MIN_LENGTH: 2,
    MESSAGE_MIN_LENGTH: 10,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  },

  /* ── ASCII drawer ── */
  ASCII: {
    CHAR_W: 7,
    CHAR_H: 12,
    MUTATION_INTERVAL_MS: 2500,
    BASE_STRING: 'ruZ_Esc',
    EXPLOSION_SPEED: 0.3,
    EXPLOSION_DECAY: 0.015,
    EXPLOSION_DENSITY: 0.25,
    MAX_SIMULTANEOUS: 12, /* Milestone 3 addition — defensive cap so rapid clicking can't stack unbounded full-grid-adjacent draw cost; each explosion already self-decays in ~1.5s at default values */
    TOTAL_STRINGS: 22,
  },

});
