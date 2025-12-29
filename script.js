document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS GLOBAIS ---
    const viewport = document.getElementById('viewport');
    const workspaceContainer = document.getElementById('workspace-container');
    const elementsLayer = document.getElementById('elements-layer');
    const breadcrumbText = document.getElementById('breadcrumb-text');

    // --- LÓGICA DO MINI MAPA (GRAPH VIEW v3.0) ---
    
    const minimapCanvas = document.getElementById('minimap-canvas');
    const ctx = minimapCanvas.getContext('2d');
    const connectionModal = document.getElementById('connection-modal');
    const connectList = document.getElementById('connect-list');
    const connectSearch = document.getElementById('connect-search');
    const btnCancelConnect = document.getElementById('btn-cancel-connect');
    const btnCtxConnect = document.getElementById('ctx-connect');

    let graphNodes = [];
    let graphLinks = [];
    let animationFrameId;

    // Configuração do Canvas
    function resizeCanvas() {
        minimapCanvas.width = minimapCanvas.parentElement.offsetWidth;
        minimapCanvas.height = minimapCanvas.parentElement.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Chama uma vez pra iniciar

    // 1. CONSTRUIR O GRAFO (Transformar árvore em nós e links)
    function buildGraphData() {
        graphNodes = [];
        graphLinks = [];

        // Função recursiva para pegar todos os elementos
        function traverse(elementId, parentId = null) {
            const el = allElements[elementId];
            if (!el) return;

            // Cria o NÓ
            // Se ele já existe na simulação anterior, tentamos manter a posição (x, y) pra não pular
            // Se não, posição aleatória no meio
            let existingNode = graphNodes.find(n => n.id === el.id);
            
            graphNodes.push({
                id: el.id,
                name: el.name,
                // Mantém posição ou randomiza no centro
                x: existingNode ? existingNode.x : minimapCanvas.width / 2 + (Math.random() - 0.5) * 50,
                y: existingNode ? existingNode.y : minimapCanvas.height / 2 + (Math.random() - 0.5) * 50,
                vx: 0, vy: 0 // Velocidade
            });

            // Cria o LINK IMPLÍCITO (Pai -> Filho)
            if (parentId) {
                graphLinks.push({ source: parentId, target: el.id, type: 'hierarchy' });
            }

            // Cria LINKS EXPLÍCITOS (Conexões manuais)
            if (el.connections) {
                el.connections.forEach(targetId => {
                    // Evita duplicatas se A conecta B e B conecta A
                    const exists = graphLinks.find(l => 
                        (l.source === el.id && l.target === targetId) || 
                        (l.source === targetId && l.target === el.id)
                    );
                    if (!exists && allElements[targetId]) {
                        graphLinks.push({ source: el.id, target: targetId, type: 'manual' });
                    }
                });
            }

            // Recursão nos filhos
            if (el.children) {
                el.children.forEach(childId => traverse(childId, el.id));
            }
        }

        traverse('root');
    }

    // 2. SIMULAÇÃO FÍSICA (Force Layout Simples)
    function updatePhysics() {
        // Constantes da física
        const REPULSION = 500;
        const ATTRACTION = 0.05;
        const CENTER_GRAVITY = 0.02;
        const DAMPING = 0.9; // Atrito

        // A. Repulsão (Todos se empurram)
        for (let i = 0; i < graphNodes.length; i++) {
            for (let j = i + 1; j < graphNodes.length; j++) {
                const nodeA = graphNodes[i];
                const nodeB = graphNodes[j];
                
                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1; // Evita divisão por zero
                
                if (dist < 150) { // Só calcula se estiverem perto
                    const force = REPULSION / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    nodeA.vx -= fx;
                    nodeA.vy -= fy;
                    nodeB.vx += fx;
                    nodeB.vy += fy;
                }
            }
        }

        // B. Atração (Conectados se puxam)
        graphLinks.forEach(link => {
            const nodeA = graphNodes.find(n => n.id === link.source);
            const nodeB = graphNodes.find(n => n.id === link.target);
            if (!nodeA || !nodeB) return;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            
            nodeA.vx += dx * ATTRACTION;
            nodeA.vy += dy * ATTRACTION;
            nodeB.vx -= dx * ATTRACTION;
            nodeB.vy -= dy * ATTRACTION;
        });

        // C. Gravidade Central e Atualização
        const centerX = minimapCanvas.width / 2;
        const centerY = minimapCanvas.height / 2;

        graphNodes.forEach(node => {
            // Puxa pro centro pra não sumir da tela
            node.vx += (centerX - node.x) * CENTER_GRAVITY;
            node.vy += (centerY - node.y) * CENTER_GRAVITY;

            // Aplica velocidade
            node.vx *= DAMPING;
            node.vy *= DAMPING;
            node.x += node.vx;
            node.y += node.vy;
        });
    }

    // 3. DESENHAR (Render Loop)
    function draw() {
        ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        
        updatePhysics(); // Atualiza posições

        // Desenha Links
        ctx.lineWidth = 1;
        graphLinks.forEach(link => {
            const nodeA = graphNodes.find(n => n.id === link.source);
            const nodeB = graphNodes.find(n => n.id === link.target);
            if (!nodeA || !nodeB) return;

            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            // Linha Verde para conexões manuais, Cinza para hierarquia
            ctx.strokeStyle = link.type === 'manual' ? '#4CAF50' : '#444';
            ctx.stroke();
        });

        // Desenha Nós
        graphNodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
            
            // Cor: Verde se for o atual, branco outros
            if (node.id === currentParentId) {
                ctx.fillStyle = '#4CAF50';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#4CAF50';
            } else {
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
        });

        animationFrameId = requestAnimationFrame(draw);
    }

    // Inicia o Loop
    // buildGraphData(); // Será chamado quando criarmos elementos
    // draw();

    // Hook para atualizar o grafo sempre que algo mudar (RenderElements é o lugar ideal)
    const originalRenderElements = renderElements;
    renderElements = function() { // Sobrescrevemos para injetar a atualização
        originalRenderElements();
        buildGraphData();
    };
    draw(); // Inicia o loop visual


    // --- 4. INTERAÇÃO COM O MAPA (Clicar na bolinha) ---
    minimapCanvas.addEventListener('mousedown', (e) => {
        const rect = minimapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Detecta clique no nó
        const clickedNode = graphNodes.find(node => {
            const dist = Math.hypot(node.x - x, node.y - y);
            return dist < 10; // Raio de clique
        });

        if (clickedNode) {
            enterElement(clickedNode.id);
        }
    });


    // --- 5. SISTEMA DE CONEXÃO MANUAL (Modal) ---
    
    // Abrir modal ao clicar em "Connect" no menu de contexto
    if (btnCtxConnect) {
        btnCtxConnect.addEventListener('click', () => {
            closeContextMenu(); // Fecha o menu direito
            if (!contextTargetId) return; // Precisa ter clicado em alguém

            // Prepara a lista
            openConnectionModal();
        });
    }

    function openConnectionModal() {
        connectionModal.classList.remove('hidden');
        connectSearch.value = '';
        renderConnectList();
    }

    function renderConnectList(filterText = '') {
        connectList.innerHTML = '';
        
        // Lista plana de todos os elementos (exceto o próprio e Root)
        const flatList = [];
        function getFlatList(currId) {
            const el = allElements[currId];
            if (el.id !== 'root' && el.id !== contextTargetId) {
                flatList.push(el);
            }
            if(el.children) el.children.forEach(c => getFlatList(c));
        }
        getFlatList('root');

        // Filtra e renderiza
        const filtered = flatList.filter(el => el.name.toLowerCase().includes(filterText.toLowerCase()));

        filtered.forEach(el => {
            const div = document.createElement('div');
            div.className = 'connect-option';
            div.innerText = el.name; // Mostra o nome
            div.onclick = () => {
                // CRIAR CONEXÃO
                const origin = allElements[contextTargetId];
                if (!origin.connections) origin.connections = [];
                
                // Evita duplicata
                if (!origin.connections.includes(el.id)) {
                    origin.connections.push(el.id);
                }
                
                // Fecha e Atualiza
                connectionModal.classList.add('hidden');
                buildGraphData(); // Atualiza o visual do mapa
            };
            connectList.appendChild(div);
        });
    }

    // Busca no modal
    connectSearch.addEventListener('input', (e) => {
        renderConnectList(e.target.value);
    });

    // Cancelar modal
    btnCancelConnect.addEventListener('click', () => {
        connectionModal.classList.add('hidden');
    });
    
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
                name: 'Untitled Section',
                content: 'Start typing your content here...',
                x: (window.innerWidth / 2 - pannedX) / scale - 100,
                y: (window.innerHeight / 2 - pannedY) / scale - 75,
                width: 250,
                height: 180,
                children: [],
                connections: [] // <--- ADICIONE ISSO NA v3.0
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



