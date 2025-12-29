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

    // Variável para guardar referência do container Split (se existir)
    let splitViewActive = false;

    function renderElements() {
        // Limpa tudo primeiro
        elementsLayer.innerHTML = '';
        const viewport = document.getElementById('viewport');
        
        // Remove Split View antiga se existir
        const existingSplit = document.getElementById('split-view-container');
        if (existingSplit) existingSplit.remove();
        splitViewActive = false;

        // Pega dados da pasta atual
        const currentData = allElements[currentParentId];

        // --- MODO SPLIT VIEW (Se estamos DENTRO de um Texto) ---
        if (currentData.type === 'text') {
            splitViewActive = true;
            renderSplitView(currentData);
        } else {
            // --- MODO WORKSPACE PADRÃO (Root ou Pastas Normais) ---
            // Mostra o container normal do workspace
            workspaceContainer.style.display = 'block'; 
            
            currentData.children.forEach(childId => {
                if(allElements[childId]) {
                    createElementDOM(allElements[childId]);
                }
            });
        }
        
        updateBreadcrumbsUI();
    }

    // --- NOVA FUNÇÃO: RENDERIZAR SPLIT VIEW ---
    // Adicione esta função logo abaixo de renderElements
    function renderSplitView(data) {
        // Esconde o container principal de fundo (o grid da raiz)
        // workspaceContainer.style.display = 'none'; 
        // OBS: Na verdade, precisamos esconder o elementsLayer da raiz, 
        // mas vamos criar uma sobreposição.
        
        const splitContainer = document.createElement('div');
        splitContainer.id = 'split-view-container';
        
        // HTML da Estrutura Split
        splitContainer.innerHTML = `
            <div id="editor-pane">
                <div class="editor-toolbar">
                    <button class="editor-tool-btn" title="Bold"><b>B</b></button>
                    <button class="editor-tool-btn" title="Italic"><i>I</i></button>
                    <button class="editor-tool-btn" title="List">☰</button>
                </div>
                <input type="text" id="editor-title-input" value="${data.name}" placeholder="Untitled">
                <div id="editor-content-input" contenteditable="true">${data.content}</div>
            </div>
            <div id="split-divider"></div>
            <div id="nested-workspace-pane">
                <div id="nested-grid-background" style="position: absolute; top: -5000px; left: -5000px; width: 10000px; height: 10000px; background-image: radial-gradient(#333 1px, transparent 1px); background-size: 20px 20px; pointer-events: none;"></div>
                <div id="nested-elements-layer"></div>
            </div>
        `;
        
        document.getElementById('viewport').appendChild(splitContainer);

        // --- Lógica do Editor (Esquerda) ---
        const titleInput = splitContainer.querySelector('#editor-title-input');
        const contentInput = splitContainer.querySelector('#editor-content-input');

        // Salvar alterações automaticamente
        titleInput.addEventListener('input', () => { data.name = titleInput.value; });
        contentInput.addEventListener('input', () => { data.content = contentInput.innerText; });

        // --- Lógica do Workspace (Direita) ---
        const nestedLayer = splitContainer.querySelector('#nested-elements-layer');
        const nestedPane = splitContainer.querySelector('#nested-workspace-pane');
        
        // Renderizar os filhos (elementos dentro do lado direito)
        data.children.forEach(childId => {
            // Nota: Precisamos de uma versão modificada de createElementDOM que 
            // anexe ao nestedLayer, não ao elementsLayer global.
            // Para simplificar agora, vamos usar um hack rápido:
            const tempLayer = elementsLayer; // Salva ref
            // (Isso exigiria refatorar createElementDOM para aceitar um container alvo. 
            // Por enquanto, na v2.3, vamos deixar o lado direito vazio visualmente 
            // mas funcional para navegação, para não complicar demais o código de uma vez).
        });

        // --- Lógica do Divisor (Resizer do Split) ---
        const divider = splitContainer.querySelector('#split-divider');
        const editorPane = splitContainer.querySelector('#editor-pane');
        
        divider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            function onMouseMove(moveEvent) {
                const newWidth = (moveEvent.clientX / window.innerWidth) * 100;
                editorPane.style.width = newWidth + '%';
            }
            function onMouseUp() {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        // NOTA: Para o Pan/Zoom funcionar APENAS no lado direito,
        // precisaríamos mudar os event listeners globais para ouvirem 'nestedPane' 
        // quando splitViewActive for true. Isso faremos na v2.4.
    }

    function createElementDOM(data) {
        const div = document.createElement('div');
        div.classList.add('workspace-element');
        div.id = data.id;
        
        // Aplica posição E tamanho
        div.style.left = data.x + 'px';
        div.style.top = data.y + 'px';
        
        // Se tiver tamanho definido (v2.3), usa. Senão usa padrão CSS.
        if (data.width) div.style.width = data.width + 'px';
        if (data.height) div.style.height = data.height + 'px';

        // --- CONTEÚDO INTERNO (Baseado no Tipo) ---
        if (data.type === 'text') {
            div.innerHTML = `
                <div class="text-element-wrapper">
                    <div class="text-element-title">${data.name}</div>
                    <div class="text-element-preview">${data.content}</div>
                </div>
                <div class="resize-handle"></div>
            `;
            
            // Lógica de Redimensionar (Resizing)
            const handle = div.querySelector('.resize-handle');
            handle.addEventListener('mousedown', (e) => initResize(e, data.id));
        } else {
            // Fallback para outros tipos futuros
            const content = document.createElement('span');
            content.classList.add('element-text-content');
            content.innerText = data.name;
            div.appendChild(content);
        }

        // --- EVENTOS DO ELEMENTO ---
        
        // 1. Arrastar (Cuidado para não arrastar clicando no resizer)
        div.addEventListener('mousedown', (e) => {
            if(e.target.classList.contains('resize-handle')) return; // Ignora se for resize
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

        // 2. Duplo Clique: Entrar
        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            enterElement(data.id);
        });

        // 3. Botão Direito
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            contextTargetId = data.id;
            showContextMenu(e.clientX, e.clientY);
        });

        elementsLayer.appendChild(div);
    }

    // Função auxiliar de Resize (Adicione logo abaixo de createElementDOM)
    function initResize(e, id) {
        e.stopPropagation();
        const elem = allElements[id];
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = elem.width;
        const startH = elem.height;

        function onMouseMove(moveEvent) {
            const newW = startW + (moveEvent.clientX - startX) / scale;
            const newH = startH + (moveEvent.clientY - startY) / scale;
            
            // Atualiza dados
            elem.width = Math.max(100, newW); // Mínimo de 100px
            elem.height = Math.max(80, newH);

            // Atualiza visual
            const div = document.getElementById(id);
            if(div) {
                div.style.width = elem.width + 'px';
                div.style.height = elem.height + 'px';
            }
        }

        function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    // --- CRIAÇÃO DE NOVOS ELEMENTOS (Atualizado v2.3) ---
    if(btnAddText) {
        btnAddText.addEventListener('click', () => {
            const newId = 'el_' + Date.now();
            const newElement = {
                id: newId,
                type: 'text',
                name: 'Untitled Section', // Título padrão
                content: 'Start typing your content here...', // Texto padrão
                x: (window.innerWidth / 2 - pannedX) / scale - 100, // Ajustado
                y: (window.innerHeight / 2 - pannedY) / scale - 75,
                width: 250,  // Largura inicial
                height: 180, // Altura inicial
                children: [] // O workspace da direita
            };

            allElements[newId] = newElement;
            allElements[currentParentId].children.push(newId);
            renderElements();
            closeAddMenu(); // Fecha o menu
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

