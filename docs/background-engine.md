# Background Engine — Photo Wall, Scroll Narrative, Load Screen, ASCII

El fondo/landing del sitio se compone de 4 "módulos" numerados en los propios
comentarios del código como parte del "Landing Redesign": Load Screen (4), Photo Wall
(2), Scroll Narrative (3), y el hero card ya existente (1) que se re-parenta dentro
del scroll narrativo en su última "parada".

## Módulo 2 — Photo Wall (`photoWall.js` + `photo-wall-media.js`)

Fondo fijo (`z-index: 0`) de 3 columnas verticales con fotos/videos en marquee
infinito, inspirado en un CodePen ("Vertical Slide Gallery Wall", DeyJordan —
estructura adaptada, no copiada).

**Cómo se edita**: solo se toca `photo-wall-media.js` (lista plana de rutas). La
extensión del archivo decide automáticamente si se renderiza como `<img>` o
`<video autoplay muted loop playsinline>` — no hay campo extra que llenar.
`photoWall.js` nunca se toca para agregar/quitar/reordenar contenido.

**Distribución**: round-robin automático en 3 columnas (item 1→col A, 2→col B, 3→col
C, 4→col A...). Cada columna duplica su lista una vez para que el `@keyframes` de
scroll (`translateY(-50%)`) cierre el loop sin salto visible.

**Disciplina de pausa** (mismo patrón que `asciiDrawer.js`): se pausa por
`IntersectionObserver` (fuera de viewport) **y** por `visibilitychange` (pestaña
oculta), combinados — no basta con una sola condición. Importante: pausar la
animación CSS del marquee (`animation-play-state`) **no** detiene el decode/playback
real de los `<video>` — por eso el JS también llama `.pause()`/`.play()` explícito
sobre cada `<video>` trackeado en el array `videos`.

## Módulo 3 — Scroll Narrative (`scrollNarrative.js` + `scroll-narrative-config.js`)

Sistema de "paradas" de scroll con efecto dolly-zoom multiplano (no hay traslación en
Y — es puro travelling de eje Z).

**Archivo de calibración**: `scroll-narrative-config.js` es el único archivo que se
edita para ajustar contenido — "swap `src` values, done". Cada parada define:

- `header` / `description` — texto.
- `background` — plano base, siempre `depth: 0` (la referencia de zoom).
- `layers[]` — imágenes PNG con transparencia, cada una con `depth` explícito (no
  depende del orden del array). Depth mayor = más cerca de cámara = más zoom relativo.
- `isLastStop` (opcional) — si se marca, `scrollNarrative.js` reubica el hero card
  (`#glassModule`) dentro de esa parada. Actualmente **ninguna** parada la usa a
  propósito: el hero card vive fuera del scroll narrativo, comportamiento preferido.

**Placeholders**: con `src: null`, el motor renderiza automáticamente un bloque de
color etiquetado en vez de fallar — el módulo es 100% testeable sin imágenes reales.

**Curvas de progreso** (constantes en `scrollNarrative.js`):

| Constante | Rol |
|---|---|
| `ZOOM_START = 0.1` | tramo estático inicial antes de que arranque el zoom |
| `BLUR_START = 0.5` | punto donde arranca el blur/fade gradual (curva separada del zoom) |
| `MAX_SCALE = 2.6` | escala final del dolly-zoom |
| `EXIT_BLUR_PX = 22` | blur máximo al final del recorrido |
| `DEPTH_INTENSITY = 0.18` | cuánto zoom extra por nivel de `depth` (`multiplier = 1 + depth * DEPTH_INTENSITY`) |

**Solape entre paradas**: cada parada empieza a asomar cuando la anterior lleva
exactamente la mitad de su propio scroll (`margin-top: calc((--stop-height - 100vh) /
-2)`) — nunca hay más de 2 paradas visibles a la vez. Si se cambia `--stop-height`, el
solape se recalcula solo vía `calc()`.

**Performance**: parallax solo se computa para paradas actualmente intersectando el
viewport (tracked vía `IntersectionObserver`, flag `inRange`) — nunca para paradas
fuera de pantalla. Scroll listeners son passive + batched con rAF (nunca corre más de
una vez por frame). `will-change` se activa solo mientras `.is-active`.

## Módulo 4 — Load Screen (`loadScreen.js` + `loadScreen.css`)

Espera una carrera entre:

1. `document.fonts.ready` (las 3 fuentes custom).
2. Cada archivo en `PHOTO_WALL_MEDIA` (imágenes vía `load`/`error`, videos vía
   `loadedmetadata`/`error` — preload propio, independiente del DOM de
   `photoWall.js`).
3. El avatar hero, **solo si** ya tiene una ruta real (no el placeholder
   `YOUR-PHOTO-FILENAME`) — chequeo oportunista, no bloqueante si aún no está.

...contra un timeout duro (`CONFIG.LOAD_SCREEN.MAX_WAIT_MS`, 4000ms) para que un solo
asset lento/roto nunca atrape al visitante indefinidamente. Además hay un piso mínimo
(`MIN_DISPLAY_MS`, 500ms) para que la pantalla de carga no desaparezca en un flash en
conexiones rápidas, lo que se lee como un glitch más que como una señal positiva.

## ASCII Drawer (`asciiDrawer.js`)

Fondo animado de canvas dentro del panel "archivo visual" (`#morePanel`). Dibuja
strings mutantes (`C.BASE_STRING = 'ruZ_Esc'`) que ondulan siguiendo funciones seno y
reaccionan al mouse (deformación local si el cursor está cerca) y al click
(explosiones de caracteres `@` que decaen con el tiempo).

- **Desactivado completamente en móvil** (`isMobile.matches` → `return` temprano).
- FPS cap distinto por dispositivo (45 desktop / 24 móvil) vía `frameMs`.
- `MAX_SIMULTANEOUS: 12` en `CONFIG.ASCII` — cap defensivo para que clicks rápidos no
  apilen costo de dibujo sin límite (cada explosión ya decae sola en ~1.5s).
- Se activa/desactiva combinando `panel.classList.contains('open')` **y**
  `!document.hidden` (función `isActive()`) — el mismo patrón de condición combinada
  que `photoWall.js` reutiliza explícitamente.

## Legacy: `slideshow.js` (huérfano, no cargado)

Ver también `architecture.md` → "Hallazgos". Este archivo implementaba el fondo Ken
Burns original (antes del Photo Wall) y **ya no está enlazado** en `index.html` (hay
una nota del propio autor confirmándolo al final del `<body>`). Su CSS asociado
(`.bg-slide`, `.bg-img`, `@keyframes panRight/panLeft/panUp/panDown/zoomIn/zoomOut`)
está comentado/desactivado en `base.css` y `animations.css`. Las claves de `CONFIG`
que necesitaría (`SLIDE_ANIM_SEQ`, `SLIDE_INTERVAL_MS`, `SLIDE_FALLBACK_MS`) también
están comentadas en `config.js` — el módulo fue reemplazado íntegramente por
`photoWall.js`, pero el archivo fuente permanece en el repo sin usarse.
