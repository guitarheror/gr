const world = document.getElementById('world');
const contextMenu = document.getElementById('context-menu');

// Estado do Workspace
let state = {
    scale: 1,
    panning: false,
    pointX: 0, // Posição X do mundo
    pointY: 0, // Posição Y do mundo
    startX: 0,
    startY: 0
};

// Configurações de Zoom
const ZOOM_SPEED = 0.1;
const MAX_SCALE = 5;
const MIN_SCALE = 0.1;

// --- FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO ---
function updateTransform() {
    world.style.transform = `translate(${state.pointX}px, ${state.pointY}px) scale(${state.scale})`;
    // Atualiza a posição do background para dar a ilusão de infinito perfeito
    // Se quiser que os pontos fiquem fixos em relação aos elementos, remova a linha abaixo. 
    // Se quiser que o grid seja o "chão", mantenha o background no world (como está no CSS).
}

// --- MOUSE WHEEL (ZOOM) ---
window.addEventListener('wheel', (e) => {
    e.preventDefault();

    const xs = (e.clientX - state.pointX) / state.scale;
    const ys = (e.clientY - state.pointY) / state.scale;

    const delta = -Math.sign(e.deltaY);
    const step = 0.1; // Intensidade do zoom
    
    let newScale = state.scale + (delta * step);
    // Limites de zoom
    if (newScale > MAX_SCALE) newScale = MAX_SCALE;
    if (newScale < MIN_SCALE) newScale = MIN_SCALE;

    state.pointX = e.clientX - xs * newScale;
    state.pointY = e.clientY - ys * newScale;
    state.scale = newScale;

    updateTransform();
}, { passive: false });

// --- MOUSE DOWN (INICIAR PAN OU ARRASTAR ELEMENTO) ---
window.addEventListener('mousedown', (e) => {
    // Esconde menu de contexto se estiver aberto
    contextMenu.style.display = 'none';

    // Botão Esquerdo (0)
    if (e.button === 0) {
        // Verifica se clicou em um elemento ou no vazio
        if (e.target.classList.contains('element')) {
            // Lógica para arrastar elemento (Placeholder para o futuro)
            // Por enquanto, vamos permitir arrastar o elemento dentro do grid
            initElementDrag(e, e.target);
        } else {
            // Clicou no vazio: Pan (Mover o mundo)
            state.panning = true;
            state.startX = e.clientX - state.pointX;
            state.startY = e.clientY - state.pointY;
            world.style.cursor = 'grabbing';
        }
    }
});

// --- MOUSE MOVE ---
window.addEventListener('mousemove', (e) => {
    if (state.panning) {
        e.preventDefault();
        state.pointX = e.clientX - state.startX;
        state.pointY = e.clientY - state.startY;
        updateTransform();
    }
});

// --- MOUSE UP ---
window.addEventListener('mouseup', () => {
    state.panning = false;
    world.style.cursor = 'default';
});

// --- RIGHT CLICK (CONTEXT MENU) ---
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Posiciona o menu onde o mouse está
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;

    // Lógica futura: detectar se clicou num elemento para mostrar opções diferentes
    if (e.target.classList.contains('element')) {
        console.log("Menu aberto sobre um elemento");
    } else {
        console.log("Menu aberto no workspace");
    }
});

// --- FUNÇÃO AUXILIAR: ARRASTAR ELEMENTO (Lógica Básica) ---
function initElementDrag(e, element) {
    let startMouseX = e.clientX;
    let startMouseY = e.clientY;
    
    // Pega a posição atual do elemento (top/left)
    let startElemX = parseInt(element.style.left || 0);
    let startElemY = parseInt(element.style.top || 0);

    function moveElement(ev) {
        // Calcula o delta considerando o zoom atual do mundo
        const deltaX = (ev.clientX - startMouseX) / state.scale;
        const deltaY = (ev.clientY - startMouseY) / state.scale;
        
        element.style.left = `${startElemX + deltaX}px`;
        element.style.top = `${startElemY + deltaY}px`;
    }

    function stopElementDrag() {
        window.removeEventListener('mousemove', moveElement);
        window.removeEventListener('mouseup', stopElementDrag);
    }

    window.addEventListener('mousemove', moveElement);
    window.addEventListener('mouseup', stopElementDrag);
}
