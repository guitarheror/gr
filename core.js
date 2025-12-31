// --- GLOBAIS ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const sidebar = document.getElementById('sidebar');
const svgLayer = document.getElementById('connections-layer');
const contextMenu = document.getElementById('context-menu');
const connectionPicker = document.getElementById('connection-picker');
const pickerList = document.getElementById('picker-list');
const breadcrumbsBar = document.getElementById('breadcrumbs');

const state = {
    scale: 1, x: 0, y: 0,
    isPanning: false, panStartX: 0, panStartY: 0,
    draggedCard: null, cardStartX: 0, cardStartY: 0, mouseStartX: 0, mouseStartY: 0
};

let currentLayerID = 'root';
// layerStack guarda: { id: 'card-1', title: 'Nome do Projeto' }
let layerStack = []; 
let layerStorage = { 'root': { elements: [], connections: [] } };
let currentConnections = []; 
let contextTargetID = null;

// --- SISTEMA DE CAMADAS ---

function saveCurrentLayerState() {
    const elements = Array.from(world.children).filter(el => el.classList.contains('card'));
    layerStorage[currentLayerID] = {
        elements: elements,
        connections: [...currentConnections], 
        viewState: { x: state.x, y: state.y, scale: state.scale },
        // Salvamos o título atual desta camada caso precisemos exibi-lo ao voltar
        title: currentLayerID === 'root' ? 'Brain' : 'Camada' 
    };
}

function enterLayer(targetCardID, targetCardTitle) {
    // 1. Antes de sair, salvamos o título da camada atual para o histórico
    const currentTitle = layerStack.length === 0 ? 'Brain' : layerStack[layerStack.length - 1].title;
    
    let parentTitle = 'Brain';
    if (currentLayerID !== 'root') {
         // Recupera o nome da camada atual para salvar no histórico
         const lastCrumb = document.querySelector('.crumb.active');
         parentTitle = lastCrumb ? lastCrumb.innerText : 'Voltar';
    }

    saveCurrentLayerState();
    
    // Adiciona a camada que estamos SAINDO no histórico
    layerStack.push({ id: currentLayerID, title: parentTitle });

    // Muda para a nova
    currentLayerID = targetCardID;
    
    // Atualiza breadcrumb com o título que recebemos do card clicado
    updateBreadcrumbs(targetCardTitle);
    
    if (!layerStorage[currentLayerID]) {
        layerStorage[currentLayerID] = { elements: [], connections: [], viewState: { x: 0, y: 0, scale: 1 } };
    }
    renderLayer(currentLayerID);
}

function goToLayer(layerID) {
    if (layerID === currentLayerID) return;
    saveCurrentLayerState();

    // Corta o histórico
    const index = layerStack.findIndex(l => l.id === layerID);
    if (index !== -1) {
        layerStack = layerStack.slice(0, index);
    } else if (layerID === 'root') {
        layerStack = [];
    }

    currentLayerID = layerID;
    
    // Ao voltar, precisamos descobrir qual título mostrar no "active".
    renderLayer(currentLayerID);
    updateBreadcrumbs(); 
}

function updateBreadcrumbs(activeTitleOverride) {
    let html = ``;
    
    // Se o stack está vazio, estamos no root
    if (layerStack.length === 0) {
         html += `<span class="crumb active">Brain</span>`;
    } else {
        // Desenha o histórico
        layerStack.forEach((layer, index) => {
            html += `<span class="crumb" onclick="goToLayer('${layer.id}')">${layer.title}</span>`;
            html += `<span class="crumb-separator">/</span>`;
        });

        // Desenha o atual
        let displayTitle = activeTitleOverride;
        if (!displayTitle) {
            displayTitle = "Camada Atual"; // Fallback se voltarmos e perdermos o nome
        }
        html += `<span class="crumb active">${displayTitle}</span>`;
    }

    breadcrumbsBar.innerHTML = html;
}

function renderLayer(layerID) {
    const cards = document.querySelectorAll('.card');
    cards.forEach(c => c.remove());
    svgLayer.innerHTML = ''; 

    const data = layerStorage[layerID];
    currentConnections = data.connections || [];
    
    data.elements.forEach(el => world.appendChild(el));

    currentConnections.forEach(conn => {
        // Importante: recriar como PATH, não LINE
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('connector-line');
        conn.line = path; 
        svgLayer.appendChild(path);
        const el1 = document.getElementById(conn.from);
        const el2 = document.getElementById(conn.to);
        if(el1 && el2) drawSVGPath(path, el1, el2);
    });

    if (data.viewState) {
        state.x = data.viewState.x; y = data.viewState.y; state.scale = data.viewState.scale;
    } else {
        state.x = 0; state.y = 0; state.scale = 1;
    }
    draw();
}

// --- DRAW & EVENTS ---

function draw() {
    world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    viewport.style.backgroundPosition = `${state.x}px ${state.y}px`;
    viewport.style.backgroundSize = `${40 * state.scale}px ${40 * state.scale}px`;
    document.getElementById('zoom-level').innerText = Math.round(state.scale * 100) + '%';
}

// --- DUPLO CLIQUE (SMART TITLES) ---
viewport.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.card');
    
    if (card) {
        e.stopPropagation();
        
        // PEGA O TÍTULO REAL (editado pelo usuário)
        let title = card.querySelector('h2') ? card.querySelector('h2').innerText : 'Sem Nome';
        title = title.trim();
        if(!title) title = "Sem Nome";

        card.style.transform += " scale(1.1)";
        setTimeout(() => {
            enterLayer(card.id, title);
        }, 100);
    }
});

viewport.addEventListener('mousedown', (e) => {
    if (e.button === 2) return; 
    hideContextMenu();
    if (e.button === 1) { e.preventDefault(); startPan(e); return; }
    if (e.button === 0) {
        const card = e.target.closest('.card');
        // Se clicou em editável (h2/p), deixa o navegador focar no texto
        if (e.target.isContentEditable) return; 

        if (card) startDragCard(e, card);
        else startPan(e);
    }
});

window.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
        e.preventDefault();
        state.x = e.clientX - state.panStartX;
        state.y = e.clientY - state.panStartY;
        draw();
    }
    if (state.draggedCard) {
        e.preventDefault();
        const dX = e.clientX - state.mouseStartX;
        const dY = e.clientY - state.mouseStartY;
        const nX = state.cardStartX + (dX / state.scale);
        const nY = state.cardStartY + (dY / state.scale);
        state.draggedCard.style.transform = `translate(${nX}px, ${nY}px)`;
        state.draggedCard.setAttribute('data-x', nX);
        state.draggedCard.setAttribute('data-y', nY);
        updateLines(state.draggedCard.id);
    }
});

window.addEventListener('mouseup', () => {
    state.isPanning = false;
    if (state.draggedCard) { state.draggedCard.classList.remove('dragging'); state.draggedCard = null; }
    viewport.style.cursor = 'default';
});

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const d = -Math.sign(e.deltaY);
    const s = Math.min(Math.max(0.1, state.scale + (d * 0.1)), 5);
    const mX = e.clientX; 
    const mY = e.clientY; 
    state.x -= (mX - state.x) * (s / state.scale - 1);
    state.y -= (mY - state.y) * (s / state.scale - 1);
    state.scale = s;
    draw();
}, { passive: false });

function startPan(e) {
    state.isPanning = true;
    state.panStartX = e.clientX - state.x;
    state.panStartY = e.clientY - state.y;
    viewport.style.cursor = 'grabbing';
}

function startDragCard(e, card) {
    state.draggedCard = card;
    state.mouseStartX = e.clientX;
    state.mouseStartY = e.clientY;
    state.cardStartX = parseFloat(card.getAttribute('data-x'));
    state.cardStartY = parseFloat(card.getAttribute('data-y'));
    card.classList.add('dragging');
    e.stopPropagation();
}

// --- CONEXÕES FLUIDAS (BÉZIER) ---

function updateLines(movedCardID) {
    currentConnections.forEach(conn => {
        if (conn.from === movedCardID || conn.to === movedCardID) {
            const el1 = document.getElementById(conn.from);
            const el2 = document.getElementById(conn.to);
            if (el1 && el2) drawSVGPath(conn.line, el1, el2);
        }
    });
}

// A MÁGICA DA CURVA ACONTECE AQUI
function drawSVGPath(pathElement, el1, el2) {
    const x1 = parseFloat(el1.getAttribute('data-x')) + (el1.offsetWidth / 2);
    const y1 = parseFloat(el1.getAttribute('data-y')) + (el1.offsetHeight / 2);
    const x2 = parseFloat(el2.getAttribute('data-x')) + (el2.offsetWidth / 2);
    const y2 = parseFloat(el2.getAttribute('data-y')) + (el2.offsetHeight / 2);
    const offset = 50000;

    // Pontos reais no SVG
    const sx = x1 + offset;
    const sy = y1 + offset;
    const ex = x2 + offset;
    const ey = y2 + offset;

    // Calcula curvatura baseada na distância
    const dist = Math.abs(ex - sx) * 0.5; 
    const cp1x = sx + dist; // Control Point 1
    const cp2x = ex - dist; // Control Point 2

    // Comando SVG Path: Move (M) -> Cubic Bezier (C)
    const d = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`;
    
    pathElement.setAttribute('d', d);
}

function createConnection(targetID) {
    if (!contextTargetID || contextTargetID === targetID) return;
    // Cria PATH em vez de LINE
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('connector-line');
    svgLayer.appendChild(path);
    
    const conn = { from: contextTargetID, to: targetID, line: path };
    currentConnections.push(conn);

    const el1 = document.getElementById(contextTargetID);
    const el2 = document.getElementById(targetID);
    drawSVGPath(path, el1, el2);
    closePicker();
}

// --- MENU E PLUGINS ---
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const card = e.target.closest('.card');
    if (card) {
        contextTargetID = card.id;
        showContextMenu(e.clientX, e.clientY, true);
    } else {
        hideContextMenu();
    }
});

function showContextMenu(x, y, isCard) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.innerHTML = ''; 

    if (isCard) {
        const btnConnect = document.createElement('div');
        btnConnect.className = 'menu-item';
        btnConnect.innerText = '🔗 Conectar';
        btnConnect.onclick = openConnectionPicker;
        contextMenu.appendChild(btnConnect);
    }
}

function hideContextMenu() { contextMenu.style.display = 'none'; }

function openConnectionPicker() {
    hideContextMenu();
    connectionPicker.style.display = 'block';
    pickerList.innerHTML = '';
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        if (card.id === contextTargetID) return; 
        const item = document.createElement('div');
        item.className = 'picker-option';
        const title = card.querySelector('h2') ? card.querySelector('h2').innerText : 'Sem Nome';
        item.innerText = `${title}`;
        item.onclick = () => createConnection(card.id);
        pickerList.appendChild(item);
    });
}
function closePicker() { connectionPicker.style.display = 'none'; }

function registerPlugin(icon, tooltip, action) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.innerHTML = icon;
    btn.title = tooltip;
    btn.onclick = (e) => { e.stopPropagation(); action(); };
    sidebar.appendChild(btn);
}

function spawnCardAtCenter(contentHTML) {
    const centerX = ((window.innerWidth - 60) / 2 - state.x) / state.scale;
    const centerY = ((window.innerHeight) / 2 - state.y) / state.scale;
    const el = document.createElement('div');
    el.className = 'card';
    el.id = 'card-' + Date.now(); 
    el.setAttribute('data-x', centerX);
    el.setAttribute('data-y', centerY);
    el.style.transform = `translate(${centerX}px, ${centerY}px)`;
    el.innerHTML = contentHTML;
    world.appendChild(el);
}

registerPlugin('📝', 'Criar Nota', () => spawnCardAtCenter(`<h2 contenteditable="true">Nota</h2><p contenteditable="true">Escreva...</p>`));
registerPlugin('📁', 'Novo Projeto', () => spawnCardAtCenter(`<h2 contenteditable="true" style="color:#bb86fc">Projeto</h2><p>Duplo Clique</p>`));

draw();
