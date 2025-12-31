const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");

let isPanning = false;
let startX = 0;
let startY = 0;

let translateX = 0;
let translateY = 0;
let scale = 1;

function updateGrid() {
  const gridSize = 32 * scale;
  viewport.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
}

function applyTransform() {
  canvas.style.transform = `
    translate(${translateX}px, ${translateY}px)
    scale(${scale})
  `;
  updateGrid();
}

applyTransform();

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

  translateX += dx;
  translateY += dy;

  startX = e.clientX;
  startY = e.clientY;

  applyTransform();
});

window.addEventListener("mouseup", () => {
  isPanning = false;
});

// ZOOM — scroll
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomSpeed = 0.0015;
  const delta = -e.deltaY * zoomSpeed;

  scale = Math.min(Math.max(0.2, scale + delta), 3);
  applyTransform();
}, { passive: false });

// Botão direito — desativado
viewport.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
