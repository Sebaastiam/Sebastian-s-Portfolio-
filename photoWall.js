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
     decode/playback (a real gap this project already had to learn
     the hard way in a different file)

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

  function buildItem(path) {
    const item = document.createElement('div');
    item.className = 'photo-wall__item';

    if (VIDEO_EXT.test(path)) {
      const video = document.createElement('video');
      video.src = path;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true; /* matches the same attribute set already used on your existing bg-slide videos in index.html */
      item.appendChild(video);
      videos.push(video);
    } else {
      const img = document.createElement('img');
      img.src = path;
      img.loading = 'lazy';
      img.alt = ''; /* decorative background wall — same reasoning as the existing .bg-img slides, which are also aria-hidden */
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

    /* Duplicate once — CSS keyframe scrolls exactly -50%, so the
       duplicate creates a seamless wrap with no visible jump */
    const doubled = colItems.concat(colItems);
    doubled.forEach(path => track.appendChild(buildItem(path)));

    col.appendChild(track);
    inner.appendChild(col);
  });

  root.appendChild(inner);
  root.setAttribute('aria-hidden', 'true'); /* decorative, same treatment as #bgContainer */

  /* ── Pause/resume: off-screen (IntersectionObserver) AND
     hidden-tab (visibilitychange), combined — mirrors asciiDrawer.js's
     isActive() pattern rather than handling either condition alone ── */
  let isIntersecting = true;

  function applyState() {
    const shouldRun = isIntersecting && !document.hidden;
    root.classList.toggle('is-paused', !shouldRun);
    videos.forEach(v => {
      if (shouldRun) v.play().catch(() => {}); /* ignore autoplay-policy rejections, same as the Vimeo pause/resume fix in panels.js */
      else v.pause();
    });
  }

  new IntersectionObserver(entries => {
    isIntersecting = entries[0].isIntersecting;
    applyState();
  }, { threshold: 0 }).observe(root);

  document.addEventListener('visibilitychange', applyState);
})();
