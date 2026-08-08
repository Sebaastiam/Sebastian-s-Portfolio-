/* ══════════════════════════════════════════════════════════
   scroll-narrative-config.js
   ══════════════════════════════════════════════════════════

   NUEVO: `scrollLength` (opcional, por parada) — override de --stop-height
   sólo para esa parada. Úsalo cuando una parada necesita más recorrido que
   las demás (como la primera acá: antes eran 2 paradas separadas, ahora
   es 1 sola alargada para dar espacio al modelo 3D al final).

   NUEVO: `model` (opcional, una sola vez, en la parada donde debe aparecer) —
     src:        ruta al .glb (motor tres.js vive en ./scroll/three.js)
     revealFrom: 0..1, en qué punto del progress PROPIO de esta parada
                 empieza a asomar el modelo (antes borroso/lejano)
     revealTo:   0..1, en qué punto ya está en foco/primer plano
     Fuera de [revealFrom, revealTo] el modelo no se renderiza (pausado),
     así no cuesta nada mientras el usuario ni siquiera ha llegado ahí.
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
      revealFrom: 0.55, /* justo donde antes arrancaba la 2ª parada "Bogotá, de noche" */
      revealTo: 0.98,   /* casi al final del recorrido — primerísimo plano */
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
