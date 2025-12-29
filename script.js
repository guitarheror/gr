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
        // Decide qual container mover baseada em onde estamos
        let targetContainer;
        
        if (splitViewActive) {
            targetContainer = document.getElementById('nested-workspace-container');
        } else {
            targetContainer = workspaceContainer;
        }

        if (targetContainer) {
            targetContainer.style.transform = `translate(${pannedX}px, ${pannedY}px) scale(${scale})`;
            
            // Salva o estado no objeto atual para não perder ao navegar
            allElements[currentParentId].panX = pannedX;
            allElements[currentParentId].panY = pannedY;
            allElements[currentParentId].zoom = scale;
        }
    }

    // --- EVENTOS DO MOUSE (Modificados para suportar Nested) ---
    
    // Zoom (Wheel)
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Se estivermos na Split View, queremos dar zoom SÓ se o mouse estiver na direita
        if (splitViewActive) {
            const editorPane = document.getElementById('editor-pane');
            // Se o mouse estiver sobre o editor, não dê zoom no workspace
            if (e.clientX < editorPane.getBoundingClientRect().width) return;
        }

        const delta = -Math.sign(e.deltaY); 
        const zoomFactor = 1 + (delta * ZOOM_SPEED);
        let newScale = scale * zoomFactor;
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Nota: O cálculo de zoom relativo ao mouse precisa considerar offset se estiver aninhado
        // Para simplificar na v2.4, vamos manter o zoom centralizado no container atual
        // Ajuste fino de matemática fica para v2.5 se precisar.
        
        const workspaceMouseX = (mouseX - pannedX) / scale;
        const workspaceMouseY = (mouseY - pannedY) / scale;

        scale = newScale;
        pannedX = mouseX - (workspaceMouseX * scale);
        pannedY = mouseY - (workspaceMouseY * scale);

        updateTransform();
    }, { passive: false });

    // Mover Workspace (Rodinha)
    viewport.addEventListener('mousedown', (e) => {
        // ... (códigos de fechar menus mantidos) ...
        
        if (e.button === 1) { // Rodinha
            // Se split view ativa, verificar se clicou na direita
            if (splitViewActive) {
                const editorPane = document.getElementById('editor-pane');
                if (e.clientX < editorPane.getBoundingClientRect().width) return;
            }

            if(!e.target.closest('.workspace-element') && !e.target.closest('.ui-element')) {
                isDraggingWorkspace = true;
                startDragX = e.clientX - pannedX;
                startDragY = e.clientY - pannedY;
                viewport.style.cursor = 'grabbing';
            }
        }
    });

    // Variável para guardar referência do container Split (se existir)
    let splitViewActive = false;

    function renderElements() {
        elementsLayer.innerHTML = '';
        
        // Remove Split View antiga se existir
        const existingSplit = document.getElementById('split-view-container');
        if (existingSplit) existingSplit.remove();
        
        const currentData = allElements[currentParentId];

        if (currentData.type === 'text') {
            splitViewActive = true;
            renderSplitView(currentData);
        } else {
            splitViewActive = false;
            workspaceContainer.style.display = 'block'; // Garante que volta a aparecer
            
            currentData.children.forEach(childId => {
                if(allElements[childId]) {
                    createElementDOM(allElements[childId], elementsLayer);
                }
            });
        }
        updateBreadcrumbsUI();
    }

    // --- FUNÇÃO: RENDERIZAR SPLIT VIEW (v2.4 - Funcional) ---
    function renderSplitView(data) {
        // Esconde o grid principal para não confundir (opcional, mas bom pra performance)
        workspaceContainer.style.display = 'none';

        const splitContainer = document.createElement('div');
        splitContainer.id = 'split-view-container';
        
        splitContainer.innerHTML = `
            <div id="editor-pane">
                <div class="editor-toolbar">
                    <button class="editor-tool-btn" data-cmd="bold" title="Bold"><b>B</b></button>
                    <button class="editor-tool-btn" data-cmd="insertUnorderedList" title="List">☰</button>
                </div>
                <input type="text" id="editor-title-input" value="${data.name}" placeholder="Untitled">
                <div id="editor-content-input" contenteditable="true">${data.content}</div>
            </div>
            <div id="split-divider"></div>
            <div id="nested-workspace-pane">
                <div id="nested-workspace-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-origin: 0 0;">
                    <div style="position: absolute; top: -5000px; left: -5000px; width: 10000px; height: 10000px; background-image: radial-gradient(#333 1px, transparent 1px); background-size: 20px 20px; pointer-events: none;"></div>
                    <div id="nested-elements-layer"></div>
                </div>
            </div>
        `;
        
        document.getElementById('viewport').appendChild(splitContainer);

        // --- 1. Lógica do Editor (Toolbar) ---
        const toolbarBtns = splitContainer.querySelectorAll('.editor-tool-btn');
        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Impede perder o foco
                const cmd = btn.dataset.cmd;
                document.execCommand(cmd, false, null);
                
                // Toggle visual simples
                // (Para um estado real seria ideal verificar document.queryCommandState, 
                // mas para este protótipo, toggle funciona bem)
                btn.classList.toggle('active');
            });
        });

        const titleInput = splitContainer.querySelector('#editor-title-input');
        const contentInput = splitContainer.querySelector('#editor-content-input');

        titleInput.addEventListener('input', () => { data.name = titleInput.value; });
        contentInput.addEventListener('input', () => { data.content = contentInput.innerHTML; }); // innerHTML para salvar o HTML (bold/listas)

        // --- 2. Renderizar Elementos no Workspace da Direita ---
        // Aqui está o segredo: Chamamos o render dos filhos apontando para o layer novo
        const nestedElementsLayer = document.getElementById('nested-elements-layer');
        
        data.children.forEach(childId => {
            if(allElements[childId]) {
                // Passamos o container alvo para a função de criação
                createElementDOM(allElements[childId], nestedElementsLayer);
            }
        });

        // Aplica o Transform inicial do workspace aninhado
        const nestedContainer = document.getElementById('nested-workspace-container');
        if(nestedContainer) {
             // Usa os dados salvos ou reseta se for a primeira vez
            const currentZoom = data.zoom || 1;
            const currentPanX = data.panX || 0;
            const currentPanY = data.panY || 0;
            nestedContainer.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;
        }


        // --- 3. Lógica do Divisor (Limites 25%) ---
        const divider = splitContainer.querySelector('#split-divider');
        const editorPane = splitContainer.querySelector('#editor-pane');
        
        divider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            function onMouseMove(moveEvent) {
                // Calcula porcentagem
                let newWidthPercent = (moveEvent.clientX / window.innerWidth) * 100;
                
                // LIMITES (v2.4)
                if (newWidthPercent < 25) newWidthPercent = 25;
                if (newWidthPercent > 75) newWidthPercent = 75;
                
                editorPane.style.width = newWidthPercent + '%';
            }
            function onMouseUp() {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    function createElementDOM(data, targetLayer = elementsLayer) { // Valor padrão é o layer principal
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

        targetLayer.appendChild(div);
    }

    // Função auxiliar de Resize (v2.4 - Com Limites)
    function initResize(e, id) {
        e.stopPropagation();
        const elem = allElements[id];
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = elem.width || 250; // Fallback se não tiver width
        const startH = elem.height || 180;

        function onMouseMove(moveEvent) {
            const newW = startW + (moveEvent.clientX - startX) / scale;
            const newH = startH + (moveEvent.clientY - startY) / scale;
            
            // LIMITES (v2.4)
            // Largura mínima: 200px
            // Altura mínima: 100px (para garantir título visível)
            elem.width = Math.max(200, newW); 
            elem.height = Math.max(100, newH);

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


