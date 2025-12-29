// Referências aos elementos principais
const viewport = document.getElementById('viewport');
const workspaceContainer = document.getElementById('workspace-container');

// Referências UI v1.1
const addButton = document.getElementById('add-button');
const addMenu = document.getElementById('add-menu');
const addIconSymbol = document.getElementById('add-icon-symbol');

// --- Estado do Workspace ---
let scale = 1;
let pannedX = 0;
let pannedY = 0;
let isDragging = false;
let startDragX, startDragY;

// Configurações de Zoom
const ZOOM_SPEED = 0.1;
const MAX_SCALE = 5;
const MIN_SCALE = 0.1;

// Função Principal: Atualiza a visualização
function updateTransform() {
    workspaceContainer.style.transform = `translate(${pannedX}px, ${pannedY}px) scale(${scale})`;
}

// --- LÓGICA DO MENU DE ADICIONAR (v1.1) ---
addButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Impede que o clique passe para o viewport
    
    const isHidden = addMenu.classList.contains('hidden');
    
    if (isHidden) {
        addMenu.classList.remove('hidden');
        addIconSymbol.textContent = 'close'; 
    } else {
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add'; 
    }
});

// Fechar o menu se clicar fora dele
viewport.addEventListener('mousedown', (e) => {
    if (!addMenu.classList.contains('hidden') && 
        !e.target.closest('#add-menu') && 
        !e.target.closest('#add-button')) {
        
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add';
    }
    
    // --- LÓGICA DE ARRASTAR (PANNING) ATUALIZADA (v1.2) ---
    // Verifica se é Botão Esquerdo (0) OU Botão do Meio/Rodinha (1)
    if ((e.button === 0 || e.button === 1) && !e.target.closest('.ui-element')) {
        
        // Se for o botão do meio, previne o comportamento padrão (aquele ícone de scroll do navegador)
        if (e.button === 1) {
            e.preventDefault(); 
        }

        isDragging = true;
        startDragX = e.clientX - pannedX;
        startDragY = e.clientY - pannedY;
        viewport.style.cursor = 'grabbing';
    }
});

// --- Restante da lógica de Navegação ---

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        // Previne seleção de texto indesejada enquanto arrasta
        e.preventDefault();
        
        pannedX = e.clientX - startDragX;
        pannedY = e.clientY - startDragY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        viewport.style.cursor = 'default';
    }
});

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY); 
    const zoomFactor = 1 + (delta * ZOOM_SPEED);
    let newScale = scale * zoomFactor;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const workspaceMouseX = (mouseX - pannedX) / scale;
    const workspaceMouseY = (mouseY - pannedY) / scale;

    scale = newScale;
    pannedX = mouseX - (workspaceMouseX * scale);
    pannedY = mouseY - (workspaceMouseY * scale);

    updateTransform();
}, { passive: false });

viewport.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // Futuramente menu de contexto aqui
});

// Inicializa
updateTransform();
