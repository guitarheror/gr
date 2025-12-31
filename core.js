const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const zoomDisplay = document.getElementById('zoom-level');

const state = {
    scale: 1,
    x: 0,
    y: 0,
    isPanning: false,
    panningStartX: 0,
    panningStartY: 0,
    draggedCard: null,
    cardStartX: 0, cardStartY: 0,
    mouseStartX: 0, mouseStartY: 0
};

function draw() {
    world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    viewport.style.backgroundPosition = `${state.x}px ${state.y}px`;
    viewport.style.backgroundSize = `${40 * state.scale}px ${40 * state.scale}px`;
    zoomDisplay.innerText = Math.round(state.scale * 100) + '%';
}

function startPan(e) {
    state.isPanning = true;
    state.panningStartX = e.clientX - state.x;
    state.panningStartY = e.clientY - state.y;
    viewport.style.cursor = 'grabbing';
}

// --- EVENTOS DE MOUSE ---

viewport.addEventListener('mousedown', (e) => {
    // Botão do Meio (Rodinha)
    if (e.button === 1) {
        e.preventDefault();
        startPan(e);
        return;
    }

    // Botão Esquerdo
    if (e.button === 0) {
        const card = e.target.closest('.card');

        if (card) {
            state.draggedCard = card;
            state.mouseStartX = e.clientX;
            state.mouseStartY = e.clientY;
            state.cardStartX = parseFloat(card.getAttribute('data-x'));
            state.cardStartY = parseFloat(card.getAttribute('data-y'));
            card.classList.add('dragging');
            e.stopPropagation(); 
        } else {
            startPan(e);
        }
    }
});

window.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
        e.preventDefault();
        state.x = e.clientX - state.panningStartX;
        state.y = e.clientY - state.panningStartY;
        draw();
        return;
    }

    if (state.draggedCard) {
        e.preventDefault();
        const deltaX = e.clientX - state.mouseStartX;
        const deltaY = e.clientY - state.mouseStartY;
        const newX = state.cardStartX + (deltaX / state.scale);
        const newY = state.cardStartY + (deltaY / state.scale);

        state.draggedCard.style.transform = `translate(${newX}px, ${newY}px)`;
        state.draggedCard.setAttribute('data-x', newX);
        state.draggedCard.setAttribute('data-y', newY);
    }
});

window.addEventListener('mouseup', () => {
    state.isPanning = false;
    viewport.style.cursor = 'default';

    if (state.draggedCard) {
        state.draggedCard.classList.remove('dragging');
        state.draggedCard = null;
    }
});

// --- ZOOM ---

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const delta = -Math.sign(e.deltaY);
    const prevScale = state.scale;
    let newScale = state.scale + (delta * zoomIntensity);
    newScale = Math.min(Math.max(0.1, newScale), 5);

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    state.x -= (mouseX - state.x) * (newScale / prevScale - 1);
    state.y -= (mouseY - state.y) * (newScale / prevScale - 1);

    state.scale = newScale;
    draw();
}, { passive: false });

// --- DUPLO CLIQUE (CRIAR CARD) ---
viewport.addEventListener('dblclick', (e) => {
    if (e.target.closest('.card')) return;

    const worldX = (e.clientX - state.x) / state.scale;
    const worldY = (e.clientY - state.y) / state.scale;

    const newCard = document.createElement('div');
    newCard.className = 'card';
    newCard.setAttribute('data-x', worldX);
    newCard.setAttribute('data-y', worldY);
    newCard.style.transform = `translate(${worldX}px, ${worldY}px)`;
    newCard.innerHTML = `<h2>Ideia</h2><p>Novo card criado!</p>`;

    world.appendChild(newCard);
});

// Inicializa
draw();
