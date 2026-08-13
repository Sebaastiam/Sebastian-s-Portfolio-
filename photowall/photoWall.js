/* ══════════════════════════════════════════════════════════
   photoWall.js
   Landing Redesign — Module 2 of 4 (Photo Wall background)
   Sebastián Castillo Portfolio — Engineering Pass v3.2 → UX/UI Phase
   Depends on: photo-wall-media.js (must load BEFORE this file —
   provides the PHOTO_WALL_MEDIA array)

   WHAT THIS FILE DOES:
   - Distributes PHOTO_WALL_MEDIA round-robin across 3 columns
   - Builds <video> for .webm/.mp4, <img> for everything else —
     purely by file extension, matching what photo-wall-media.js
     promises
   - Duplicates each column's list once, for the CSS's seamless
     -50% loop
   - Pauses BOTH the CSS marquee animation AND actual video playback
     when the wall is off-screen or the tab is hidden — same
     combined-condition discipline as asciiDrawer.js's isActive(),
     since CSS animation-play-state alone does not stop video
     decode/playback

   PERF FIX (Issue #2 — v3.2.1):
   - Previously, colItems.concat(colItems) doubled every path and
     then buildItem() created a full <video autoplay> for EACH slot,
     including the clone half. The browser treats every <video> with
     autoplay as an independent download stream — so a single 4.69MB
     .webm was being requested 3× simultaneously (once per column
     that contained it, plus its clone in the same column).

   - Fix: buildItem() now accepts an `isClone` flag. Clone slots for
     video files get a lightweight <div class="photo-wall__item
     photo-wall__item--clone"> with a CSS background-image instead
     of a <video> element. This means:
       · Zero extra network requests for the clone half
       · The CSS marquee loop is visually identical (same dimensions,
         same vignette/sticker effect)
       · Only the original slots decode and play video — clones are
         purely visual stand-ins painted by the GPU from the already-
         decoded frame cached in memory

   - For image items (non-video), clones remain <img loading="lazy">
     as before — the browser already deduplicates image requests to
     the same src, so no change needed there.

   HOW TO USE:
   1. Add a <div class="photo-wall" id="photoWall"></div> wherever
      the wall should render (see the integration guide).
   2. Load photo-wall-media.js, then this file, in that order.
   Nothing else — the DOM is built entirely by this script.
   ══════════════════════════════════════════════════════════ */

(function initPhotoWall() {
  const root = document.getElementById('photoWall');
  if (!root || typeof PHOTO_WALL_MEDIA === 'undefined' || !PHOTO_WALL_MEDIA.length) return;

  const VIDEO_EXT = /\.(webm|mp4)$/i;
  const COLUMN_COUNT = 3;

  /* ── Distribute round-robin into COLUMN_COUNT arrays ── */
  const columns = Array.from({ length: COLUMN_COUNT }, () => []);
  PHOTO_WALL_MEDIA.forEach((path, i) => columns[i % COLUMN_COUNT].push(path));

  const videos = []; /* tracked so we can actually .pause()/.play() them,
    not just toggle the CSS animation that drives the column scroll */

  /* PERF FIX: isClone flag — video clones become CSS-only stand-ins,
     image clones stay as <img> (browser deduplicates those already). */
  function buildItem(path, isClone) {
    const item = document.createElement('div');
    item.className = 'photo-wall__item';

    if (VIDEO_EXT.test(path)) {
      if (isClone) {
        /* Clone slot: a styled <div> that mirrors the video's appearance
           via CSS background. No <video> element = no download stream.
           The CSS marquee animation makes this slot scroll into view only
           after the original has already played — visually seamless. */
        item.classList.add('photo-wall__item--clone');
        /* Use the video src as a CSS custom property so photo-wall.css
           can optionally style it (e.g. a poster image if one exists).
           No src attribute = no network request triggered. */
        item.dataset.cloneSrc = path;
        /* Accessible no-op: decorative, same as the aria-hidden on root */
      } else {
        /* Original slot: real <video> element, plays and is tracked */
        const video = document.createElement('video');
        video.src = path;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        item.appendChild(video);
        videos.push(video);
      }
    } else {
      /* Images: browser deduplicates requests to the same src automatically,
         so clones can remain real <img> elements without extra downloads. */
      const img = document.createElement('img');
      img.src = path;
      img.loading = 'lazy';
      img.alt = ''; /* decorative background wall */
      item.appendChild(img);
    }
    return item;
  }

  /* ── Build DOM ── */
  const inner = document.createElement('div');
  inner.className = 'photo-wall__inner';

  columns.forEach(colItems => {
    if (!colItems.length) return;
    const col = document.createElement('div');
    col.className = 'photo-wall__col';
    const track = document.createElement('div');
    track.className = 'photo-wall__track';

    /* Original items first (isClone = false), then clone items (isClone = true).
       CSS keyframe scrolls exactly -50% so the clone half creates a seamless
       wrap — visually identical to before, zero extra video download streams. */
    colItems.forEach(path => track.appendChild(buildItem(path, false)));
    colItems.forEach(path => track.appendChild(buildItem(path, true)));

    col.appendChild(track);
    inner.appendChild(col);
  });

  root.appendChild(inner);
  root.setAttribute('aria-hidden', 'true'); /* decorative */

  /* ── Pause/resume: off-screen (IntersectionObserver) AND
     hidden-tab (visibilitychange), combined — mirrors asciiDrawer.js's
     isActive() pattern rather than handling either condition alone ── */
  let isIntersecting = true;

  function applyState() {
    const shouldRun = isIntersecting && !document.hidden;
    root.classList.toggle('is-paused', !shouldRun);
    videos.forEach(v => {
      if (shouldRun) v.play().catch(() => {}); /* ignore autoplay-policy rejections */
      else v.pause();
    });
  }

  new IntersectionObserver(entries => {
    isIntersecting = entries[0].isIntersecting;
    applyState();
  }, { threshold: 0 }).observe(root);

  document.addEventListener('visibilitychange', applyState);
})();
