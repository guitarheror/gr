// Referências aos elementos principais
const viewport = document.getElementById('viewport');
const workspaceContainer = document.getElementById('workspace-container');

// --- Estado do Workspace ---
let scale = 1; // Nível de zoom atual
let pannedX = 0; // Posição X atual
let pannedY = 0; // Posição Y atual

// Variáveis para controle do arrastar (panning)
let isDragging = false;
let startDragX, startDragY;

// Configurações de Zoom
const ZOOM_SPEED = 0.1;
const MAX_SCALE = 5;
const MIN_SCALE = 0.1;


// --- Função Principal: Atualiza a visualização ---
function updateTransform() {
    // Aplica a translação (mover) e a escala (zoom) ao container
    workspaceContainer.style.transform = `translate(${pannedX}px, ${pannedY}px) scale(${scale})`;
}


// --- Funcionalidade 1: Panning (Arrastar com botão esquerdo) ---

viewport.addEventListener('mousedown', (e) => {
    // Apenas botão esquerdo (button 0) inicia o arraste
    // E verificamos se não estamos clicando em um elemento de UI
    if (e.button === 0 && !e.target.closest('.ui-element')) {
        isDragging = true;
        startDragX = e.clientX - pannedX;
        startDragY = e.clientY - pannedY;
        viewport.style.cursor = 'grabbing'; // Muda o cursor
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        pannedX = e.clientX - startDragX;
        pannedY = e.clientY - startDragY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        viewport.style.cursor = 'default'; // Volta o cursor
    }
});


// --- Funcionalidade 2: Zoom (Roda do mouse) ---

viewport.addEventListener('wheel', (e) => {
    e.preventDefault(); // Impede o scroll padrão da página

    // Determina a direção do zoom (para dentro ou para fora)
    const delta = -Math.sign(e.deltaY); 
    const zoomFactor = 1 + (delta * ZOOM_SPEED);
    
    // Calcula o novo zoom, respeitando os limites
    let newScale = scale * zoomFactor;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    // --- O Cálculo Mágico do Zoom ---
    // Para dar zoom onde o mouse está, precisamos ajustar a posição (pan)
    // simultaneamente à escala.

    // 1. Posição do mouse relativa à tela
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 2. Calcula onde o mouse estaria no workspace "antes" do novo zoom
    const workspaceMouseX = (mouseX - pannedX) / scale;
    const workspaceMouseY = (mouseY - pannedY) / scale;

    // 3. Atualiza a escala
    scale = newScale;

    // 4. Recalcula a posição (pan) para que o ponto sob o mouse permaneça no mesmo lugar
    pannedX = mouseX - (workspaceMouseX * scale);
    pannedY = mouseY - (workspaceMouseY * scale);

    updateTransform();
}, { passive: false });


// --- Funcionalidade 3: Botão Direito (Placeholder futuro) ---
viewport.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Impede o menu padrão do navegador
    console.log("Botão direito clicado em:", e.clientX, e.clientY);
    // Futuramente: Abrir menu de opções aqui
});

// Inicializa a posição
updateTransform();