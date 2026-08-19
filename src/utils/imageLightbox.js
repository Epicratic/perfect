// Universal Image Lightbox / Fullscreen Viewer
export function openImageLightbox(imgSrc, title = "Aperçu de l'image") {
  if (!imgSrc) return;

  const existing = document.getElementById('perf-image-lightbox');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'perf-image-lightbox';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: fadeIn 0.2s ease-out;
  `;

  overlay.innerHTML = `
    <div style="width: 100%; max-width: 500px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; color: white;">
      <span style="font-size: 13px; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${title}</span>
      <button id="btn-close-lightbox" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">
        ✕
      </button>
    </div>
    <div style="max-width: 100%; max-height: 80vh; overflow: hidden; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); background: #000; display: flex; align-items: center; justify-content: center;">
      <img src="${imgSrc}" alt="${title}" style="max-width: 100%; max-height: 80vh; object-fit: contain; display: block;" />
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#btn-close-lightbox').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

export function attachLightboxToImages(containerEl) {
  if (!containerEl) return;
  const imgs = containerEl.querySelectorAll('.rating-attachment-image');
  imgs.forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openImageLightbox(img.src, img.alt || "Photo de l'évaluation");
    });
  });
}
