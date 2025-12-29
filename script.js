document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS GLOBAIS ---
    const viewport = document.getElementById('viewport');
    const workspaceContainer = document.getElementById('workspace-container');
    const elementsLayer = document.getElementById('elements-layer');
    const breadcrumbText = document.getElementById('breadcrumb-text');

    // UI Menus
    const addButton = document.getElementById('add-button');
    const addMenu = document.getElementById('add-menu');
    const addIconSymbol = document.getElementById('add-icon-symbol');
    const contextMenu = document.getElementById('context-menu');
    const btnAddText = document.getElementById('btn-add-text');
    const btnCtxOpen = document.getElementById('ctx-open');

    // --- ESTADO E DADOS ---
    let allElements = {
        'root': { id: 'root', type: 'root', name: 'Workspace', children: [], panX: 0, panY: 0, zoom: 1 }
    };
    let currentParentId = 'root'; 

    // Variáveis de Visualização
    let scale = 1;
    let pannedX = 0;
    let pannedY = 0;

    // Variáveis de Controle
    let isDraggingWorkspace = false;
    let isDraggingElement = false;
    let draggedElementId = null;
    let startDragX, startDragY;
    let initialElemX, initialElemY;
    
    // Variável temporária para saber em quem clicamos com botão direito
    let contextTargetId = null;

    const ZOOM_SPEED = 0.1;
    const MAX_SCALE = 5;
    const MIN_SCALE = 0.1;

    // --- CORE: ATUALIZAÇÃO VISUAL ---
    function updateTransform() {
        workspaceContainer.style.transform = `translate(${pannedX}px, ${pannedY}px) scale(${scale})`;
    }

    // --- LÓGICA DE ELEMENTOS E HIERARQUIA ---
    function renderElements() {
        elementsLayer.innerHTML = '';
        const currentFolder = allElements[currentParentId];
        
        currentFolder.children.forEach(childId => {
            if(allElements[childId]) {
                createElementDOM(allElements[childId]);
            }
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

        // EVENTOS DO ELEMENTO (TEXTO)
        
        // 1. Botão Esquerdo: Arrastar o elemento
        div.addEventListener('mousedown', (e) => {
            if(e.button === 0) { // Somente botão esquerdo
                e.stopPropagation(); // Impede que o clique passe pro fundo
                isDraggingElement = true;
                draggedElementId = data.id;
                startDragX = e.clientX; 
                startDragY = e.clientY;
                initialElemX = data.x;
                initialElemY = data.y;
                div.style.cursor = 'grabbing';
            }
        });

        // 2. Duplo Clique: Entrar na camada
        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            enterElement(data.id);
        });

        // 3. Botão Direito: Menu de Contexto
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            contextTargetId = data.id; // Salva quem foi clicado
            showContextMenu(e.clientX, e.clientY);
        });

        elementsLayer.appendChild(div);
    }

    // --- CRIAÇÃO DE NOVOS ELEMENTOS ---
    if(btnAddText) {
        btnAddText.addEventListener('click', () => {
            const newId = 'el_' + Date.now();
            const newElement = {
                id: newId,
                type: 'text',
                name: 'New Text',
                // Centraliza baseado no pan/zoom atual
                x: (window.innerWidth / 2 - pannedX) / scale - 75,
                y: (window.innerHeight / 2 - pannedY) / scale - 40,
                children: [] 
            };

            allElements[newId] = newElement;
            allElements[currentParentId].children.push(newId);
            renderElements();
            closeAddMenu();
        });
    }

    // --- NAVEGAÇÃO (Breadcrumbs) ---
    function enterElement(elementId) {
        // Salva estado do pai atual
        allElements[currentParentId].panX = pannedX;
        allElements[currentParentId].panY = pannedY;
        allElements[currentParentId].zoom = scale;

        // Muda para o filho
        currentParentId = elementId;
        
        // Recupera ou Reseta estado do filho
        const nextData = allElements[elementId];
        scale = nextData.zoom || 1;
        pannedX = nextData.panX || 0;
        pannedY = nextData.panY || 0;

        renderElements();
        updateTransform();
    }

    function navigateUpTo(targetId) {
        // Salva estado atual
        allElements[currentParentId].panX = pannedX;
        allElements[currentParentId].panY = pannedY;
        allElements[currentParentId].zoom = scale;

        // Muda para o alvo
        currentParentId = targetId;
        const targetData = allElements[targetId];
        scale = targetData.zoom;
        pannedX = targetData.panX;
        pannedY = targetData.panY;

        renderElements();
        updateTransform();
    }

    function updateBreadcrumbsUI() {
        breadcrumbText.innerHTML = '';
        let path = [];
        let curr = allElements[currentParentId];
        
        // Reconstrói o caminho até a raiz
        while(curr) {
            path.unshift({ id: curr.id, name: curr.name });
            let parent = null;
            // Busca ineficiente mas funcional para v2
            for(const key in allElements) {
                if(allElements[key].children && allElements[key].children.includes(curr.id)) {
                    parent = allElements[key];
                    break;
                }
            }
            curr = parent;
        }

        path.forEach((step, index) => {
            const span = document.createElement('span');
            span.innerText = step.name;
            span.onclick = () => navigateUpTo(step.id);
            breadcrumbText.appendChild(span);
            
            if (index < path.length - 1) {
                const sep = document.createElement('span');
                sep.innerText = ' / ';
                sep.style.color = '#666';
                sep.style.margin = '0 5px';
                breadcrumbText.appendChild(sep);
            }
        });
    }

    // --- INTERFACE UTILS ---
    function toggleAddMenu() {
        const isHidden = addMenu.classList.contains('hidden');
        if (isHidden) {
            addMenu.classList.remove('hidden');
            addIconSymbol.textContent = 'close';
        } else {
            closeAddMenu();
        }
    }

    function closeAddMenu() {
        addMenu.classList.add('hidden');
        addIconSymbol.textContent = 'add';
    }

    function showContextMenu(x, y) {
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.remove('hidden');
    }

    function closeContextMenu() {
        contextMenu.classList.add('hidden');
    }

    // Listeners de UI
    addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAddMenu();
    });

    if(btnCtxOpen) {
        btnCtxOpen.addEventListener('click', () => {
            if(contextTargetId) enterElement(contextTargetId);
            closeContextMenu();
        });
    }

    // --- CONTROLES GLOBAIS (Mouse) ---
    
    viewport.addEventListener('mousedown', (e) => {
        // 1. Fechar menus se clicar fora
        if (!addMenu.classList.contains('hidden') && !e.target.closest('#add-menu') && !e.target.closest('#add-button')) {
            closeAddMenu();
        }
        if (!contextMenu.classList.contains('hidden') && !e.target.closest('#context-menu')) {
            closeContextMenu();
        }

        // 2. MOVER WORKSPACE (Apenas Botão do Meio = 1)
        if (e.button === 1) {
            e.preventDefault(); // Evita scroll do navegador
            // Verifica se NÃO estamos clicando em um elemento ou UI
            if(!e.target.closest('.workspace-element') && !e.target.closest('.ui-element')) {
                isDraggingWorkspace = true;
                startDragX = e.clientX - pannedX;
                startDragY = e.clientY - pannedY;
                viewport.style.cursor = 'grabbing';
            }
        }
    });

    window.addEventListener('mousemove', (e) => {
        // Mover Workspace
        if (isDraggingWorkspace) {
            e.preventDefault();
            pannedX = e.clientX - startDragX;
            pannedY = e.clientY - startDragY;
            updateTransform();
        }

        // Mover Elemento
        if (isDraggingElement && draggedElementId) {
            e.preventDefault();
            const deltaX = e.clientX - startDragX;
            const deltaY = e.clientY - startDragY;
            
            const elData = allElements[draggedElementId];
            elData.x = initialElemX + (deltaX / scale);
            elData.y = initialElemY + (deltaY / scale);
            
            const div = document.getElementById(draggedElementId);
            if(div) {
                div.style.left = elData.x + 'px';
                div.style.top = elData.y + 'px';
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

    // Inicialização
    renderElements();
    updateTransform();
});
