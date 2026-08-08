/* ══════════════════════════════════════════════════════════
   scroll-narrative-config.js
   ══════════════════════════════════════════════════════════

   NUEVO: `scrollLength` (opcional, por parada) — override de --stop-height
   sólo para esa parada. Úsalo cuando una parada necesita más recorrido que
   las demás (como la primera acá: antes eran 2 paradas separadas, ahora
   es 1 sola alargada para dar espacio al modelo 3D al final).

   NUEVO: `model` (opcional, una sola vez, en la parada donde debe aparecer) —
     src:         ruta al .glb (motor tres.js vive en ./scroll/)
     revealFrom:  0..1, dónde empieza a asomar (borroso/lejano → foco)
     revealTo:    0..1, dónde ya está a foco/opacidad completa
     fadeOutFrom: 0..1, dónde empieza a desvanecer otra vez
     fadeOutTo:   0..1, dónde ya desapareció del todo
     El zoom (--model-scale) es continuo en TODO [revealFrom, fadeOutTo] —
     sigue acercándose aunque ya esté a opacidad 1. Fuera de esa ventana
     completa, el modelo no se renderiza (pausado) — cero costo.
   ══════════════════════════════════════════════════════════ */

window.SCROLL_NARRATIVE_CONFIG = [

  {
    header: 'Calles que caminé',
    description: '',
    scrollLength: '380vh', /* antes 220vh — el excedente es lo que antes era la parada "Bogotá, de noche" */
    background: { type: 'image', src: "./scroll/1.3.webp" },
    layers: [
      { src: "./scroll/1.2.webp", depth: 2 },  // far — distant skyline
      { src: "./scroll/1.1.webp", depth: 12 }, // mid — mid-ground rooftops
      { src: "./scroll/1.webp",   depth: 24 }, // near — foreground streetlamp/wire, zoom más intenso
    ],
    model: {
      src: './scroll/mushroom.glb', /* ajusta el nombre real del archivo */
      revealFrom: 0.1,    /* antes 0.00 — 0 exacto es un borde delicado (progress rara vez es EXACTAMENTE 0), 0.1 es más confiable */
      revealTo: 0.3,      /* rápido a foco completo, y ahí se sostiene */
      fadeOutFrom: 0.88,  /* empieza a desvanecer cerca del final... */
      fadeOutTo: 1,        /* ...y llega a 0 justo antes de pasar a "El estudio" — OJO: nunca > 1, rompe el fade (traía 1.3) */
    },
  },
  {
    header: 'El estudio',
    description: '',
    background: { type: 'image', src: "./scroll/3.webp" },
    layers: [
      { src: "./scroll/3.1.webp", depth: 10 }, // far
    ],
  },
];
