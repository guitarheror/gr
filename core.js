const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");

let isPanning = false;
let startX = 0;
let startY = 0;

let translateX = 0;
let translateY = 0;
let scale = 1;

const BASE_GRID_SIZE = 32;

function updateGrid() {
  const size = BASE_GRID_SIZE * scale;
  viewport.style.backgroundSize = `${size}px ${size}px`;
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

// PAN
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

// ZOOM
viewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const zoomSpeed = 0.0015;
    const delta = -e.deltaY * zoomSpeed;

    scale = Math.min(Math.max(0.25, scale + delta), 4);
    applyTransform();
  },
  { passive: false }
);

// CONTEXT MENU (desativado)
viewport.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
