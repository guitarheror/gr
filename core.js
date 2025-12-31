const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");

let isPanning = false;
let startX = 0;
let startY = 0;

let translateX = -25;
let translateY = -25;
let scale = 1;

function updateTransform() {
  canvas.style.transform = `translate(${translateX}%, ${translateY}%) scale(${scale})`;
}

// PAN — botão esquerdo
viewport.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  isPanning = true;
  startX = e.clientX;
  startY = e.clientY;
});

window.addEventListener("mousemove", (e) => {
  if (!isPanning) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  translateX += dx * 0.05;
  translateY += dy * 0.05;

  startX = e.clientX;
  startY = e.clientY;

  updateTransform();
});

window.addEventListener("mouseup", () => {
  isPanning = false;
});

// ZOOM — rodinha do mouse
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomIntensity = 0.0015;
  const delta = -e.deltaY * zoomIntensity;

  const newScale = Math.min(Math.max(0.2, scale + delta), 3);
  scale = newScale;

  updateTransform();
}, { passive: false });

// Botão direito — bloqueado por enquanto
viewport.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
