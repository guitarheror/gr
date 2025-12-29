// --- REFERÊNCIAS GLOBAIS ---
const viewport = document.getElementById('viewport');
const workspaceContainer = document.getElementById('workspace-container');
const elementsLayer = document.getElementById('elements-layer');
const breadcrumbsContainer = document.getElementById('breadcrumbs');
const breadcrumbText = document.getElementById('breadcrumb-text');

// UI Menus
const addButton = document.getElementById('add-button');
const addMenu = document.getElementById('add-menu');
const addIconSymbol = document.getElementById('add-icon-symbol');
const contextMenu = document.getElementById('context-menu');
const btnAddText = document.getElementById('btn-add-text');

// --- SISTEMA DE DADOS (HIERARQUIA) ---
let allElements = {}; 
let currentParentId = 'root'; 

// Inicializa a Raiz
allElements['root'] = {
    id: 'root',
    type: 'root',
    name: 'Workspace',
    children: [],
    panX: 0,
    panY: 0,
    zoom: 1
};

// --- ESTADO VISUAL ATUAL ---
let scale = 1;
let pannedX = 0;
let pannedY = 0;

// Variáveis de Interação
let isDraggingWorkspace = false;
let isDraggingElement = false;
let draggedElementId = null;
let startDragX, startDragY;
let initialElemX, initialElemY;

// Configurações de Zoom
const ZOOM_SPEED = 0.1;
const MAX_SCALE = 5;
const MIN_SCALE = 0.1;

// --- FUNÇÕES DE RENDERIZAÇÃO E NAVEGAÇÃO ---

function updateTransform() {
    workspaceContainer.style.transform = `translate(${pannedX}px, ${pannedY}px) scale(${scale})`;
}

function renderElements() {
    elementsLayer.innerHTML = '';
    const currentFolder = allElements[currentParentId];
    
    currentFolder.children.forEach(childId => {
        const elData = allElements[childId];
        createElementDOM(elData);
    });

    updateBreadcrumbsUI();
}

function createElementDOM(data) {
    const div = document.createElement('div');
    div.classList.add('workspace-element');
    div.id = data.id;
    div.style.left = data.x + 'px';
    div.style.top = data.y + 'px';
    
    const content = document.createElement('span');
    content.classList.add('element-text-content');
    content.innerText = data.name;
    div.appendChild(content);

    // 1. Arrastar Elemento (Botão Esquerdo)
    div.addEventListener('mousedown', (e) => {
        if(e.button === 0) { 
            e.stopPropagation(); 
            isDraggingElement = true;
            draggedElementId = data.id;
            
            startDragX = e.clientX; 
            startDragY = e.clientY;
            initialElemX = data.x;
            initialElemY = data.y;
            
            div.style.cursor = 'grabbing';
        }
    });

    // 2. Duplo Clique para ENTRAR
    div.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        enterElement(data.id);
    });

    // 3. Botão Direito (Menu de Contexto)
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, data.id);
    });

    elementsLayer.appendChild(div);
}

// --- LÓGICA DE BREADCRUMBS ---

function enterElement(elementId) {
    allElements[currentParentId].panX = pannedX;
    allElements[currentParentId].panY = pannedY;
    allElements[currentParentId].zoom = scale;

    currentParentId = elementId;

    if (allElements[elementId].zoom === undefined) {
        scale = 1;
        pannedX = 0;
        pannedY = 0;
    } else {
        scale = allElements[elementId].zoom;
        pannedX = allElements[elementId].panX;
        pannedY = allElements[elementId].panY;
    }

    renderElements();
    updateTransform();
}

function navigateUpTo(targetId) {
    allElements[currentParentId].panX = pannedX;
    allElements[currentParentId].panY = pannedY;
    allElements[currentParentId].zoom = scale;

    currentParentId = targetId;

    scale = allElements[targetId].zoom;
    pannedX = allElements[targetId].panX;
    pannedY = allElements[targetId].panY;

    renderElements();
    updateTransform();
}

function getBreadcrumbPath(currentId) {
    let path = [];
    let curr = allElements[currentId];
    
    while(curr) {
        path.unshift({ id: curr.id, name: curr.name });
        let parentFound = null;
        for (const key in allElements) {
            if (allElements[key].children && allElements[key].children.includes(curr.id)) {
                parentFound = allElements[key];
                break;
            }
        }
        curr = parentFound;
    }
    return path;
}

function updateBreadcrumbsUI() {
    const path = getBreadcrumbPath(currentParentId);
    breadcrumbText.innerHTML = '';
    
    path.forEach((step, index) => {
        const span = document.createElement('span');
        span.innerText = step.name;
        span.style.cursor = 'pointer';
        span.onclick = () => navigateUpTo(step.id);
        
        breadcrumbText.appendChild(span);
        
        if (index < path.length - 1) {
            const separator = document.createElement('span');
            separator.innerText = ' / ';
            separator.style.margin = '0 5px';
            separator.style.color = '#666';
            breadcrumbText.appendChild(separator);
        }
    });
}

// --- LÓGICA DO BOTÃO ADICIONAR (Corrigido v2.1) ---

// Toggle do Menu
addButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = addMenu.classList.contains('hidden');
    if (isHidden) {
        addMenu.classList.remove('hidden');
        addIconSymbol.textContent = 'close';
    } else {
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add';
    }
});

// Criação do Elemento de Texto
if(btnAddText) {
    btnAddText.addEventListener('click', () => {
        const newId = 'el_' + Date.now();
        const newElement = {
            id: newId,
            type: 'text',
            name: 'New Text',
            x: (window.innerWidth / 2 - pannedX) / scale - 75, // Centralizado ajustado
            y: (window.innerHeight / 2 - pannedY) / scale - 40,
            children: [] 
        };

        allElements[newId] = newElement;
        allElements[currentParentId].children.push(newId);

        renderElements();
        
        // Fecha menu após criar
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add';
    });
}

// --- INTERAÇÕES DO MOUSE GLOBAIS ---

function showContextMenu(x, y, elementId) {
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
}

viewport.addEventListener('mousedown', (e) => {
    // Esconder Context Menu
    if (!contextMenu.classList.contains('hidden') && !e.target.closest('#context-menu')) {
        contextMenu.classList.add('hidden');
    }

    // Esconder Add Menu
    if (!addMenu.classList.contains('hidden') && !e.target.closest('#add-menu') && !e.target.closest('#add-button')) {
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add';
    }

    // --- ARRASTAR WORKSPACE (Apenas Botão do Meio v2.1) ---
    // Botão 1 = Rodinha (Middle Click)
    if (e.button === 1 && !e.target.closest('.workspace-element') && !e.target.closest('.ui-element')) {
        e.preventDefault(); // Impede o scroll automático do navegador
        isDraggingWorkspace = true;
        startDragX = e.clientX - pannedX;
        startDragY = e.clientY - pannedY;
        viewport.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    // 1. Pan Workspace (Somente se for rodinha)
    if (isDraggingWorkspace) {
        e.preventDefault();
        pannedX = e.clientX - startDragX;
        pannedY = e.clientY - startDragY;
        updateTransform();
    }

    // 2. Arrastar Elemento
    if (isDraggingElement && draggedElementId) {
        e.preventDefault();
        const deltaX = e.clientX - startDragX;
        const deltaY = e.clientY - startDragY;
        
        const elementData = allElements[draggedElementId];
        elementData.x = initialElemX + (deltaX / scale);
        elementData.y = initialElemY + (deltaY / scale);
        
        const div = document.getElementById(draggedElementId);
        if(div) {
            div.style.left = elementData.x + 'px';
            div.style.top = elementData.y + 'px';
        }
    }
});

window.addEventListener('mouseup', () => {
    isDraggingWorkspace = false;
    isDraggingElement = false;
    draggedElementId = null;
    viewport.style.cursor = 'default';
});

// Zoom
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

viewport.addEventListener('contextmenu', (e) => e.preventDefault());

// Inicializa
renderElements();
updateTransform();
