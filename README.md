# Sebastián Castillo — Portfolio

> Plataforma web original construida en vanilla HTML/CSS/JS. Sin frameworks. Sin dependencias de runtime. Desplegada en GitHub Pages vía GitHub Actions.

**[→ Ver sitio en vivo](https://sebaastiam.github.io/Sebastian-s-Portfolio-/)**

---

## ¿Qué es esto?

Un portafolio transmedia que funciona simultáneamente como vitrina creativa y como proyecto de ingeniería. Combina ilustración original, producción audiovisual y desarrollo frontend en una sola plataforma con identidad visual propia — liquid glass / aero glassmorphism, tipografía editorial, animaciones CSS personalizadas y un scroll narrativo con efecto dolly-zoom multiplano.

El sitio no usa React, Vue, ni ningún framework de UI. La complejidad visual se logra íntegramente con CSS moderno (`oklch`, `@property`, `backdrop-filter`, SVG filters) y JavaScript modular sin transpilación.

---

## Stack

| Capa | Tecnología |
|---|---|
| Markup | HTML5 semántico, `importmap` nativo |
| Estilos | CSS modular — `oklch`, `@property`, `backdrop-filter`, SVG filters |
| Lógica | Vanilla JS (ES Modules, IIFE, no bundler en runtime) |
| 3D | Three.js (`three.module.js`) + GLTFLoader + DRACOLoader |
| Vídeo | WebM/MP4 nativos, Vimeo Player API (lazy) |
| CI/CD | GitHub Actions → GitHub Pages (`dist/`) |
| Build | `esbuild` + PostCSS (`scripts/build.mjs`) |
| Linting | ESLint + Stylelint |

---

## Estructura del proyecto

```
├── index.html                  ← Entrada única. Orden de carga de scripts y CSS es obligatorio.
│
├── landing/
│   ├── config.js               ← Constantes centralizadas (Object.freeze). Único punto de calibración global.
│   ├── drag.js                 ← Widgets arrastrables (glass card + botón contacto). rAF-batched, GPU-accelerated.
│   ├── historyManager.js       ← Intercepta Back de Android/iOS para paneles y modales.
│   ├── slideshow.js            ← Legacy/huérfano — Ken Burns del fondo antiguo. No enlazado en producción.
│   ├── base.css                ← Design tokens, reset, layout, a11y, z-index scale.
│   ├── animations.css          ← Catálogo canónico de @keyframes y @property.
│   └── hero-v2.css             ← Avatar / tarjeta hero dentro del glass card.
│
├── panels/
│   ├── panels.js               ← Glass card, modal de contacto, panel blog/vlog, focus-trap, gradient tracking.
│   ├── portfolio-panel.js      ← Galería: grid, 6 salas, lightbox, carrusel 3D, cursor custom. Build perezoso.
│   ├── asciiDrawer.js          ← Fondo ASCII animado (panel blog). FPS cap por dispositivo.
│   ├── components-main.css     ← Glass card, modal, botón contacto, contact section.
│   ├── components-archive.css  ← Panel blog/vlog, feed, fondo ASCII.
│   └── portafolio-panel.css    ← Panel portafolio, galería, lightbox, carrusel 3D.
│
├── photowall/
│   ├── photo-wall-media.js     ← Array de rutas de assets. Único archivo a editar para cambiar contenido.
│   ├── photoWall.js            ← Motor: 3 columnas marquee, pause/resume por IntersectionObserver + visibilitychange.
│   └── photo-wall.css          ← Layout, animación de columnas, vignette.
│
├── scroll/
│   ├── scroll-narrative-config.js  ← Configuración de paradas narrativas. Único archivo a editar para el scroll.
│   ├── scrollNarrative.js          ← Motor: dolly-zoom multiplano, modelo 3D lazy, rAF read/write batching.
│   └── scroll-narrative.css        ← Estilos del scroll narrativo.
│
├── loadscreen/
│   ├── loadScreen.js           ← Pantalla de carga con promesas reales de readiness.
│   └── loadScreen.css
│
├── scroll/draco/               ← Decoder WASM para modelos GLB comprimidos con Draco.
├── scroll/loaders/             ← GLTFLoader.js, DRACOLoader.js (Three.js ecosystem).
├── scroll/utils/               ← BufferGeometryUtils.js, SkeletonUtils.js.
│
├── fonts/                      ← AuthenticDeclaration, BebasNeue, BarlowSemiCondensed (woff2).
├── images/                     ← Perfil + galerías (galeria1–galeria5, WebP).
├── Video/                      ← Assets de vídeo pesados (WebM). Ver nota de rendimiento.
│
├── scripts/
│   ├── build.mjs               ← Pipeline esbuild + PostCSS → dist/.
│   └── clean.mjs               ← Limpia dist/ antes del build.
│
├── docs/                       ← Documentación técnica interna del proyecto.
│   ├── architecture.md
│   ├── animations.md
│   ├── glass-system.md
│   ├── performance.md
│   ├── background-engine.md
│   └── history-manager.md
│
└── .github/workflows/
    └── deploy.yml              ← CI: lint → build → deploy a GitHub Pages en cada push a main.
```

---

## Módulos principales

### 🖼️ Photo Wall (`photowall/`)
Fondo de 3 columnas con marquee vertical infinito y efecto de perspectiva 3D. Distribuye assets round-robin, pausa automáticamente cuando el elemento sale del viewport o la pestaña queda oculta. Los nodos duplicados para el loop seamless son divs invisibles (`visibility: hidden`), no elementos `<video>` — cero streams de red adicionales.

### 📜 Scroll Narrativo (`scroll/`)
Efecto dolly-zoom multiplano: cada parada del scroll tiene un fondo y capas de primer plano con distintos valores de profundidad (`depth`). A mayor `depth`, mayor multiplicador de escala respecto al fondo — simula una cámara multiplano. El modelo 3D (GLB + Draco) carga de forma perezosa solo cuando el scroll se acerca a esa parada. Todas las escrituras de estilo se agrupan en una fase única por frame para evitar forced reflows.

### 🃏 Glass Card + Drag (`landing/drag.js`)
La tarjeta hero y el botón de contacto son arrastrables en cualquier punto del viewport. El drag usa `transform: translate3d` (no `top`/`left`) durante el movimiento — compositor-only, cero recálculo de layout por frame. Al soltar, las coordenadas se hornean de vuelta a `left`/`top` como estado de reposo.

### 🎨 Sistema Glass (`panels/components-main.css`)
Tres capas superpuestas: elemento base (layout) → `::before` (tinte gradiente oklch) → `::after` (distorsión SVG + `backdrop-filter`). El filtro SVG `#glass-distortion` en `index.html` produce la textura de vidrio irregular. En móvil el filtro se reemplaza por un gradiente plano — el SVG filter casi nunca tiene aceleración GPU en Android.

### 🗂️ Galería / Portafolio (`panels/portfolio-panel.js`)
Panel lateral con grid de miniaturas, 6 salas independientes, lightbox con navegación por teclado y carrusel 3D. Todo se construye de forma perezosa — ni el panel ni las salas se montan hasta la primera apertura. El carrusel pausa su animación CSS cuando el panel está cerrado.

### 📺 Panel Blog/Vlog (`panels/panels.js` + `panels/components-archive.css`)
Panel deslizable con feed de artículos/proyectos, iframe de Vimeo inyectado dinámicamente (no precarga el player hasta que el panel se abre), y fondo de canvas ASCII con FPS cap por dispositivo (45 desktop / 24 móvil, desactivado completamente en touch).

---

## Orden de carga — crítico

El orden de los `<script>` en `index.html` no es arbitrario:

```
config.js               ← primero siempre — provee CONFIG a todos
photo-wall-media.js     ← antes de photoWall.js
loadScreen.js
photoWall.js
scroll-narrative-config.js  ← antes de scrollNarrative.js
scrollNarrative.js
historyManager.js       ← antes de panels.js y portfolio-panel.js
drag.js
panels.js
portfolio-panel.js
asciiDrawer.js
```

El CSS también tiene orden obligatorio — ver `docs/architecture.md`.

---

## Desarrollo local

```bash
# Clonar
git clone https://github.com/Sebaastiam/Sebastian-s-Portfolio-.git
cd Sebastian-s-Portfolio-

# Instalar dependencias de build (ESLint, Stylelint, esbuild, PostCSS)
npm install

# Linting
npm run lint        # JS (ESLint)
npm run lint:css    # CSS (Stylelint)

# Build de producción → dist/
npm run build
```

> El sitio funciona directamente desde `index.html` sin build — el bundle en `dist/` es solo para el deploy optimizado en GitHub Pages.

---

## Deploy

Cada push a `main` dispara el workflow `.github/workflows/deploy.yml`:

1. `npm ci` — instala dependencias
2. `npm run lint` — ESLint (non-blocking, `continue-on-error`)
3. `npm run lint:css` — Stylelint (non-blocking)
4. `npm run build` — genera `dist/`
5. Deploy de `dist/` a GitHub Pages

El deploy manual también está disponible vía `workflow_dispatch` desde la pestaña Actions.

---

## Calibración de contenido

Para modificar contenido sin tocar la lógica:

| Qué cambiar | Archivo |
|---|---|
| Versión del sitio | `landing/config.js` → `SITE_VERSION` |
| Assets del photo wall | `photowall/photo-wall-media.js` → array `PHOTO_WALL_MEDIA` |
| Paradas del scroll narrativo | `scroll/scroll-narrative-config.js` |
| Endpoint del formulario de contacto | `landing/config.js` → `FORM_ENDPOINT` |
| Vídeo de Vimeo | `landing/config.js` → `VIMEO_SRC` |
| Imágenes de galería | `images/galeria1/` … `images/galeria5/` |

---

## Notas de rendimiento

- **Vídeos pesados** (`Video/`): los archivos WebM se sirven directamente. Para reducir el peso de red se recomienda un pase de recompresión con FFmpeg (`-crf 33 -b:v 0` como punto de partida).
- **GIFs** (`images/fumgus.gif`, `images/aNIMATED.gif`): actualmente ~4.5MB combinados. Candidatos a conversión a `<video autoplay loop muted playsinline>` con encode WebM — ahorro estimado >90% de peso.
- **`images/profile.png`**: 199KB para un slot de 96×96px. Recomendado reemplazar con WebP comprimido (~10–15KB).
- **`landing/slideshow.js`**: archivo huérfano del sistema de fondo antiguo (Ken Burns). No está enlazado en producción y puede eliminarse de forma segura junto con sus CSS asociados en `animations.css`.

---

## Documentación técnica

| Documento | Contenido |
|---|---|
| `docs/architecture.md` | Mapa de módulos, orden de carga, z-index scale, hallazgos |
| `docs/animations.md` | Catálogo de `@keyframes`, `@property`, gradient tracking, carrusel 3D |
| `docs/glass-system.md` | Design tokens, anatomía del efecto glass, variante móvil |
| `docs/performance.md` | Patrones de performance aplicados, changelog por archivo, fixes CSS móvil |
| `docs/background-engine.md` | Historia del sistema de fondo (slideshow legacy → photo wall) |
| `docs/history-manager.md` | API del History Manager para paneles/modales con Back de Android |

---

## Autor

**Sebastián Castillo** — Bogotá, Colombia  
Ilustrador · Tatuador · CX Specialist · Desarrollador frontend

[Instagram](https://instagram.com/zescru) · [Linktree](https://linktr.ee/zescru) · [WhatsApp](https://wa.me/573336451709)

---

*Site v1.4.0 — Engineering Pass v3.2*
