const viewport = document.getElementById("viewport");

let isPanning = false;
let startX = 0;
let startY = 0;

let translateX = 0;
let translateY = 0;
let scale = 1;

const BASE_GRID = 32;

function updateGrid() {
  const size = BASE_GRID * scale;
  viewport.style.backgroundSize = `${size}px ${size}px`;
  viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
}

function applyTransform() {
  updateGrid();
}

applyTransform();

/* POINTER EVENTS — padrão profissional */
viewport.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;

  viewport.setPointerCapture(e.pointerId);
  isPanning = true;
  startX = e.clientX;
  startY = e.clientY;
});

viewport.addEventListener("pointermove", (e) => {
  if (!isPanning) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  translateX += dx;
  translateY += dy;

  startX = e.clientX;
  startY = e.clientY;

  applyTransform();
});

viewport.addEventListener("pointerup", () => {
  isPanning = false;
});

viewport.addEventListener("pointerleave", () => {
  isPanning = false;
});

/* ZOOM */
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

/* BOTÃO DIREITO — DESATIVADO */
viewport.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
