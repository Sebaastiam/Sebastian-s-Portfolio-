/* ══════════════════════════════════════════════════════════
   scroll-narrative-config.js
   ══════════════════════════════════════════════════════════

   LAYER ORDERING — read this before editing depths:
   The JS engine sets each layer's CSS z-index = depth value.
   The 3D model canvas is fixed at z-index: 100 in CSS (above all layers).
   Rule: bg = depth 0 (implicit), layers ascend from 1 upward.
   Higher depth = closer to camera = more zoom multiplier + higher z-index.

   IMAGE ORDER for stop 1 (city window scene):
     bg:   1.3.webp  — sky / distant background          depth 0
     far:  1.2.webp  — mid skyline                       depth 1
     mid:  1.1.webp  — rooftop / mid foreground          depth 3
     near: 1.webp    — window frame / closest element     depth 6
     3D model canvas                                      z-index 100

   scrollLength: total scroll distance for this stop.
     Real travel = scrollLength - 100vh.
     520vh → 420vh of actual dolly zoom travel.

   model reveal curve (all values 0..1, progress of THIS stop):
     revealFrom  — model starts fading in (blurry)
     revealTo    — reaches full opacity/focus — HOLD starts here
     fadeOutFrom — hold ends, fade out begins
     fadeOutTo   — fully gone, must be < 1
   ══════════════════════════════════════════════════════════ */

window.SCROLL_NARRATIVE_CONFIG = [
  {
    header: 'Calles que caminé',
    description: '',
    scrollLength: '560vh',
    background: { type: 'image', src: './scroll/1.3.webp' },
    layers: [
      { src: './scroll/1.2.webp', depth: 1 },
      { src: './scroll/1.1.webp', depth: 3 },
      { src: './scroll/1.webp',   depth: 6 }
    ],
    model: {
      src: './scroll/mushroom.glb',
      revealFrom:  0.30,
      revealTo:    0.42,
      fadeOutFrom: 0.78,
      fadeOutTo:   0.93
    }
  },
  {
    header: 'El estudio',
    description: '',
    background: { type: 'image', src: './scroll/3.webp' },
    layers: [
      { src: './scroll/3.1.webp', depth: 3 }
    ]
  }
]
