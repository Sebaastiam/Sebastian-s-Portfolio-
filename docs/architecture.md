# Architecture — Sebastián Castillo Portfolio

> Extraído de los comentarios de cabecera y notas de arquitectura dispersas en el código
> durante el Engineering Pass v3.2. Vanilla HTML/CSS/JS, sin framework ni bundler.

## Filosofía del proyecto

- Sin framework, sin bundler, huella mínima.
- Encapsulación modular: cada archivo tiene un propósito único y límites de borrado claros.
- Cero cambios en sistemas no tocados (zero-blast-radius edits).
- `config.js` y `*-media.js` / `*-config.js` son los únicos puntos de calibración —
  el resto de la lógica no debería tocarse para ajustes de contenido.

## Mapa de módulos

| Archivo | Rol | Depende de |
|---|---|---|
| `landing/config.js` | Constantes/endpoints centralizados (`CONFIG`, congelado con `Object.freeze`) | — |
| `landing/historyManager.js` | Intercepta el botón Back de Android/iOS para paneles/modales | — (debe cargar antes de `panels.js` y `portfolio-panel.js`) |
| `landing/drag.js` | Widgets arrastrables (glass card, botón de contacto) | — |
| `landing/slideshow.js` | **Legacy/huérfano** — Ken Burns del fondo antiguo | `config.js` (pero las claves que necesita ya no existen — ver "Hallazgos") |
| `panels/panels.js` | Transiciones del glass card, tracking oklch, focus-trap, validación de formulario, modal de contacto, panel "más" | `config.js`, `historyManager.js` |
| `panels/portfolio-panel.js` | Galería/portafolio: grid, salas, lightbox, carrusel 3D, cursor custom | `config.js`, `panels.js` (`createFocusTrap`), `historyManager.js` |
| `panels/asciiDrawer.js` | Fondo ASCII animado dentro del panel "más" | `config.js` (`CONFIG.ASCII`) |
| `photowall/photo-wall-media.js` | Config de contenido del photo wall (lista de rutas) | — |
| `photowall/photoWall.js` | Motor del photo wall (3 columnas, marquee) | `photo-wall-media.js` |
| `scroll/scroll-narrative-config.js` | Config de las "paradas" narrativas del scroll | — |
| `scroll/scrollNarrative.js` | Motor de scroll narrativo (dolly-zoom multiplano) | `scroll-narrative-config.js` |
| `loadscreen/loadScreen.js` | Pantalla de carga con promesas de readiness reales | `config.js` (`CONFIG.LOAD_SCREEN`), `photo-wall-media.js` |

## Orden de carga en `index.html`

```
config.js
photo-wall-media.js
loadScreen.js
photoWall.js
scroll-narrative-config.js
scrollNarrative.js
historyManager.js   ← debe ir antes de panels.js y portfolio-panel.js
drag.js
panels.js
portfolio-panel.js
asciiDrawer.js
(Vimeo Player API, defer)
```

El orden es obligatorio: cada archivo `*-config.js` / `*-media.js` debe cargar antes que
su motor correspondiente, y `historyManager.js` debe cargar antes que cualquier módulo
que registre paneles (`panels.js`, `portfolio-panel.js`).

## CSS — orden de carga obligatorio

```
base.css                → tokens, reset, layout, a11y
components-main.css     → glass card, modal, contacto, side-trigger
components-archive.css  → panel archivo/blog, feed, fondo ASCII
loadScreen.css
photo-wall.css
animations.css           → @keyframes, clases de animación
hero-v2.css               → avatar/foto hero dentro del glass card
portafolio-panel.css     → animaciones panel izquierdo
scroll-narrative.css     → scroll de inicio (EXPERIMENTAL)
```

`components-main.css` y `components-archive.css` nacieron de un `components.css`
monolítico, dividido en Milestone 2. `base.css` es la única fuente de los tokens
`--mw-*` (paleta retro-Windows) y `--heat-stop-*` (gradiente oklch "Heat Wave"),
consumidos por varios archivos que antes los redeclaraban por separado.

## Sistema de versión

`CONFIG.SITE_VERSION` (actualmente `1.4.0`) es la única fuente de verdad para el
watermark visible. Antes vivía hardcodeado en 3 lugares que podían desincronizarse
(el watermark en el DOM y los comentarios de cabecera de `config.js` y
`historyManager.js`). Bump aquí en cada release, no a mano en cada archivo.

## z-index scale (`base.css`, sección 2)

```
--z-base:        0
--z-content:      1
--z-card:        10
--z-fixed-ui:      5
--z-dragging:    100
--z-skip-link:  9999
```

No todos los z-index del proyecto están migrados a esta escala todavía — queda una
auditoría futura pendiente para el resto de valores "mágicos" (`.more-panel` en 125,
`.port-panel` en 150, `.port-lightbox` en 500, `#loadScreen` en 9999, etc.).

## Hallazgos durante esta auditoría (no corregidos — fuera del alcance pedido)

Estos son **bugs reales encontrados al leer el código**, documentados aquí para que
queden registrados, pero **no se tocó ningún archivo para corregirlos** (solo se
autorizó tocar `historyManager.js`):

1. **`index.html` carga `portfolio-panel.js` con una ruta rota**: la etiqueta dice
   `<script src="-/panels/portfolio-panel.js"></script>` — nótese el guión inicial
   `-/`. Esto probablemente hace que el navegador falle al resolver el archivo. Debería
   ser `./panels/portfolio-panel.js`.
2. **`asciiDrawer.js` está referenciado en la ruta equivocada**: `index.html` carga
   `./landing/asciiDrawer.js`, pero el archivo real vive en `./panels/asciiDrawer.js`.
3. **`slideshow.js` es código huérfano**: no está enlazado en ningún `<script>` de
   `index.html` (hay un comentario del propio autor al final del `<body>` que lo
   confirma: *"slideshow.js are missing in link but not in file"*). Además, aunque se
   cargara, referencia `CONFIG.SLIDE_ANIM_SEQ`, `CONFIG.SLIDE_INTERVAL_MS` y
   `CONFIG.SLIDE_FALLBACK_MS`, que están **comentados/eliminados** en `config.js` — el
   módulo fue reemplazado por `photoWall.js` (Módulo 2) pero el archivo no se borró.
   El CSS asociado (`.bg-slide`, `.bg-img`, animaciones Ken Burns en `animations.css`)
   también está comentado/desactivado en sus respectivos archivos por la misma razón.
4. **Preload de fuentes como TTF sin serlo** (nota ya existente en el propio código,
   Milestone 1, severidad alta): los `<link rel="preload">` de fuentes declaran
   `as="font" type="font/woff2"` en dos casos pero `as="font/woff2" type="font"` en
   otros dos (orden de atributos invertido) — vale la pena una revisión de consistencia.

Ver `background-engine.md` para más detalle sobre el módulo `slideshow.js` legacy.
