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

// --- SISTEMA DE DADOS (HIERARQUIA v2.0) ---
// Estrutura para armazenar todos os elementos
let allElements = {}; 
// ID do local atual (começamos na raiz)
let currentParentId = 'root'; 

// Inicializa a Raiz
allElements['root'] = {
    id: 'root',
    type: 'root',
    name: 'Workspace',
    children: [], // Lista de IDs dos filhos
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

// Limpa a tela e desenha os elementos da pasta atual
function renderElements() {
    // 1. Limpa visualmente
    elementsLayer.innerHTML = '';
    
    // 2. Pega o objeto da pasta atual
    const currentFolder = allElements[currentParentId];
    
    // 3. Cria o HTML para cada filho
    currentFolder.children.forEach(childId => {
        const elData = allElements[childId];
        createElementDOM(elData);
    });

    // 4. Atualiza Breadcrumbs
    updateBreadcrumbsUI();
}

function createElementDOM(data) {
    const div = document.createElement('div');
    div.classList.add('workspace-element');
    div.id = data.id;
    div.style.left = data.x + 'px';
    div.style.top = data.y + 'px';
    
    // Conteúdo (Texto simples por enquanto)
    const content = document.createElement('span');
    content.classList.add('element-text-content');
    content.innerText = data.name;
    div.appendChild(content);

    // Eventos do Elemento
    
    // 1. Arrastar Elemento
    div.addEventListener('mousedown', (e) => {
        if(e.button === 0) { // Botão Esquerdo
            e.stopPropagation(); // Não arrastar o workspace
            isDraggingElement = true;
            draggedElementId = data.id;
            
            // Posição inicial do mouse
            startDragX = e.clientX; 
            startDragY = e.clientY;
            
            // Posição inicial do elemento
            initialElemX = data.x;
            initialElemY = data.y;
            
            div.style.cursor = 'grabbing';
        }
    });

    // 2. Duplo Clique para ENTRAR (Nesting)
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

// --- LÓGICA DE ENTRAR E SAIR (Breadcrumbs) ---

function enterElement(elementId) {
    // 1. Salvar estado atual (Zoom e Pan da pasta antiga)
    allElements[currentParentId].panX = pannedX;
    allElements[currentParentId].panY = pannedY;
    allElements[currentParentId].zoom = scale;

    // 2. Mudar ponteiro para nova pasta
    currentParentId = elementId;

    // 3. Carregar estado da nova pasta (ou resetar se for novo)
    // Se o elemento ainda não tiver estado salvo, começa no centro
    if (allElements[elementId].zoom === undefined) {
        scale = 1;
        pannedX = 0;
        pannedY = 0;
    } else {
        scale = allElements[elementId].zoom;
        pannedX = allElements[elementId].panX;
        pannedY = allElements[elementId].panY;
    }

    // 4. Renderizar
    renderElements();
    updateTransform();
}

function navigateUpTo(targetId) {
    // Salva o estado atual antes de sair
    allElements[currentParentId].panX = pannedX;
    allElements[currentParentId].panY = pannedY;
    allElements[currentParentId].zoom = scale;

    // Define o novo pai
    currentParentId = targetId;

    // Recupera o estado do alvo
    scale = allElements[targetId].zoom;
    pannedX = allElements[targetId].panX;
    pannedY = allElements[targetId].panY;

    renderElements();
    updateTransform();
}

// Função para construir o caminho de pão (Breadcrumbs) recursivamente
function getBreadcrumbPath(currentId) {
    let path = [];
    let curr = allElements[currentId];
    
    while(curr) {
        path.unshift({ id: curr.id, name: curr.name });
        // Procura quem é o pai deste elemento
        // (Método simples: varrer tudo. O ideal seria ter parentId no obj, mas assim funciona pra agora)
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
    
    // Limpa o texto atual
    breadcrumbText.innerHTML = '';
    
    path.forEach((step, index) => {
        const span = document.createElement('span');
        span.innerText = step.name;
        span.style.cursor = 'pointer';
        
        // Clique no breadcrumb volta para aquele nível
        span.onclick = () => navigateUpTo(step.id);
        
        breadcrumbText.appendChild(span);
        
        // Adiciona separador se não for o último
        if (index < path.length - 1) {
            const separator = document.createElement('span');
            separator.innerText = ' / ';
            separator.style.margin = '0 5px';
            separator.style.color = '#666';
            breadcrumbText.appendChild(separator);
        }
    });
}


// --- CRIAÇÃO DE ELEMENTOS ---

function createTextElement() {
    const newId = 'el_' + Date.now();
    
    // Cria os dados do elemento
    const newElement = {
        id: newId,
        type: 'text',
        name: 'New Text',
        x: (window.innerWidth / 2 - pannedX) / scale, // Centraliza na visão atual
        y: (window.innerHeight / 2 - pannedY) / scale,
        children: [] // Ele também pode ter filhos!
    };

    // Salva no "banco de dados"
    allElements[newId] = newElement;
    
    // Adiciona o ID na lista de filhos do pai atual
    allElements[currentParentId].children.push(newId);

    renderElements();
    
    // Fecha o menu de adicionar
    addMenu.classList.add('hidden');
    addIconSymbol.textContent = 'add';
}

// Botão Adicionar Texto
if(btnAddText) {
    btnAddText.addEventListener('click', createTextElement);
}


// --- INTERAÇÕES DO MOUSE GLOBAIS ---

// Menu de Contexto
function showContextMenu(x, y, elementId) {
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    // Futuramente: Configurar ações baseadas no elementId
}

// Clique Global
viewport.addEventListener('mousedown', (e) => {
    // Esconder Context Menu se clicar fora
    if (!contextMenu.classList.contains('hidden') && !e.target.closest('#context-menu')) {
        contextMenu.classList.add('hidden');
    }

    // Fechar Add Menu se clicar fora
    if (!addMenu.classList.contains('hidden') && !e.target.closest('#add-menu') && !e.target.closest('#add-button')) {
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add';
    }

    // Lógica de Arrastar Workspace (Pan)
    if ((e.button === 0 || e.button === 1) && !e.target.closest('.workspace-element') && !e.target.closest('.ui-element')) {
        if (e.button === 1) e.preventDefault();
        isDraggingWorkspace = true;
        startDragX = e.clientX - pannedX;
        startDragY = e.clientY - pannedY;
        viewport.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    // 1. Arrastando Workspace
    if (isDraggingWorkspace) {
        e.preventDefault();
        pannedX = e.clientX - startDragX;
        pannedY = e.clientY - startDragY;
        updateTransform();
    }

    // 2. Arrastando Elemento
    if (isDraggingElement && draggedElementId) {
        e.preventDefault();
        // Delta do movimento do mouse
        const deltaX = e.clientX - startDragX;
        const deltaY = e.clientY - startDragY;
        
        // Converte delta de pixels da tela para unidades do workspace (considerando zoom)
        const elementData = allElements[draggedElementId];
        elementData.x = initialElemX + (deltaX / scale);
        elementData.y = initialElemY + (deltaY / scale);
        
        // Atualiza visualmente apenas este elemento (performance)
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

// Prevenir menu padrão global
viewport.addEventListener('contextmenu', (e) => e.preventDefault());

// Inicializa
renderElements();
updateTransform();
