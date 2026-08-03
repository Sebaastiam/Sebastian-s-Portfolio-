// Hero avatar opportunistic check (reemplaza la sección anterior)
const avatarEl = document.querySelector('.hero-avatar-wrap');
let avatarPath = null;

if (avatarEl) {
  // 1) data-avatar preferido (útil si el routing inyecta la ruta)
  if (avatarEl.dataset && avatarEl.dataset.avatar) {
    avatarPath = avatarEl.dataset.avatar;
  }

  // 2) <img> dentro del contenedor
  if (!avatarPath) {
    const avatarImg = avatarEl.querySelector('img.hero-avatar-img');
    if (avatarImg && avatarImg.src) avatarPath = avatarImg.src;
  }

  // 3) background-image CSS
  if (!avatarPath) {
    const bg = avatarEl.style.backgroundImage || getComputedStyle(avatarEl).backgroundImage;
    const match = /url\(["']?(.*?)["']?\)/.exec(bg || '');
    if (match && match[1]) avatarPath = match[1];
  }
}

// 4) fallback explícito a la ruta conocida
if (!avatarPath) {
  avatarPath = './images/profile.png';
}

// Evitar placeholders comunes
const isPlaceholder = /YOUR-PHOTO-FILENAME|placeholder|default-avatar/i.test(avatarPath);
if (avatarPath && !isPlaceholder) {
  waits.push(new Promise(resolve => {
    const img = new Image();
    img.src = avatarPath;
    img.onload = img.onerror = () => resolve();
  }));
}
