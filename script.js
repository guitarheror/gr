// --- GLOBAIS ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const sidebar = document.getElementById('sidebar');
const svgLayer = document.getElementById('connections-layer');
const contextMenu = document.getElementById('context-menu');
const connectionPicker = document.getElementById('connection-picker');
const pickerList = document.getElementById('picker-list');
const breadcrumbsBar = document.getElementById('breadcrumbs');

// Elementos do Editor de Documento
const docLayer = document.getElementById('doc-layer');
const docTitle = document.getElementById('doc-title');
const docBody = document.getElementById('doc-body');

// --- ESTADO ---
const state = { scale: 1, x: 0, y: 0, isPanning: false, panStartX: 0, panStartY: 0, draggedCard: null, mouseStartX: 0, mouseStartY: 0 };

let currentLayerID = 'root';
let layerStack = []; 
// root começa como 'canvas'
let layerStorage = { 'root': { type: 'canvas', elements: [], connections: [] } };
let currentConnections = []; 
let contextTargetID = null;

// Variável para guardar qual card estamos editando no modo documento
let activeDocCardReference = null;

// --- API PLUGINS (Declaradas ANTES de tudo para estarem prontas) ---

window.spawnCardAtCenter = function(html) {
    const cx = ((window.innerWidth-60)/2 - state.x)/state.scale; 
    const cy = (window.innerHeight/2 - state.y)/state.scale;
    const el = document.createElement('div'); 
    el.className='card'; 
    el.id='c-'+Date.now();
    el.setAttribute('data-x', cx); 
    el.setAttribute('data-y', cy); 
    el.style.transform=`translate(${cx}px,${cy}px)`;
    el.innerHTML = html; 
    world.appendChild(el); 
    return el;
};

window.registerPlugin = function(icon, title, action) {
    const btn = document.createElement('button'); 
    btn.className='tool-btn'; 
    btn.innerHTML=icon; 
    btn.title=title;
    btn.onclick=(e)=>{e.stopPropagation(); action();}; 
    sidebar.appendChild(btn);
};

// --- SISTEMA DE CAMADAS E NAVEGAÇÃO ---

function saveCurrentLayerState() {
    if (layerStorage[currentLayerID].type === 'canvas') {
        const elements = Array.from(world.children).filter(el => el.classList.contains('card'));
        layerStorage[currentLayerID].elements = elements;
        layerStorage[currentLayerID].connections = [...currentConnections];
        layerStorage[currentLayerID].viewState = { x: state.x, y: state.y, scale: state.scale };
        layerStorage[currentLayerID].title = currentLayerID === 'root' ? 'Brain' : 'Pasta';
    }
}

function enterLayer(cardID, cardTitle, cardType, cardElementReference) {
    let parentTitle = 'Brain';
    if (currentLayerID !== 'root') {
            const lastCrumb = document.querySelector('.crumb.active');
            parentTitle = lastCrumb ? lastCrumb.innerText : 'Voltar';
    }

    saveCurrentLayerState();
    layerStack.push({ id: currentLayerID, title: parentTitle, type: layerStorage[currentLayerID].type });

    currentLayerID = cardID;
    
    if (!layerStorage[currentLayerID]) {
        layerStorage[currentLayerID] = { 
            type: cardType, 
            elements: [], 
            connections: [], 
            viewState: { x: 0, y: 0, scale: 1 } 
        };
    }

    if (cardType === 'text') {
        activeDocCardReference = cardElementReference;
    }

    updateBreadcrumbs(cardTitle);
    renderLayer(currentLayerID);
}

function goToLayer(layerID) {
    if (layerID === currentLayerID) return;
    saveCurrentLayerState();

    const index = layerStack.findIndex(l => l.id === layerID);
    if (index !== -1) {
        layerStack = layerStack.slice(0, index);
    } else if (layerID === 'root') {
        layerStack = [];
    }

    currentLayerID = layerID;
    renderLayer(currentLayerID);
    updateBreadcrumbs(); 
}

// Expõe globalmente para o HTML usar
window.goToLayer = goToLayer;

function renderLayer(layerID) {
    const layerData = layerStorage[layerID];

    if (layerData.type === 'canvas') {
        // MODO CANVAS
        docLayer.classList.remove('active'); 
        viewport.style.display = 'block';    
        
        const cards = document.querySelectorAll('.card');
        cards.forEach(c => c.remove());
        svgLayer.innerHTML = ''; 

        currentConnections = layerData.connections || [];
        layerData.elements.forEach(el => world.appendChild(el));
        
        currentConnections.forEach(conn => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.classList.add('connector-line');
            conn.line = path; 
            svgLayer.appendChild(path);
            const el1 = document.getElementById(conn.from);
            const el2 = document.getElementById(conn.to);
            if(el1 && el2) drawSVGPath(path, el1, el2);
        });

        if (layerData.viewState) {
            state.x = layerData.viewState.x; state.y = layerData.viewState.y; state.scale = layerData.viewState.scale;
        } else {
            state.x = 0; state.y = 0; state.scale = 1;
        }
        draw();
    } 
    else if (layerData.type === 'text') {
        // MODO DOCUMENTO
        viewport.style.display = 'none';    
        docLayer.classList.add('active');   

        if (activeDocCardReference) {
            docTitle.value = activeDocCardReference.querySelector('h2').innerText;
            docBody.value = activeDocCardReference.querySelector('p').innerText;
        }
    }
}

// --- SINCRONIZAÇÃO DO EDITOR ---
function syncDocToCard() {
    if (activeDocCardReference) {
        const h2 = activeDocCardReference.querySelector('h2');
        const p = activeDocCardReference.querySelector('p');
        
        h2.innerText = docTitle.value || "Sem Título";
        p.innerText = docBody.value || "";

        const activeCrumb = document.querySelector('.crumb.active');
        if (activeCrumb) activeCrumb.innerText = docTitle.value || "Sem Título";
    }
}

docTitle.addEventListener('input', syncDocToCard);
docBody.addEventListener('input', syncDocToCard);

// --- BREADCRUMBS ---
function updateBreadcrumbs(activeTitleOverride) {
    let html = ``;
    if (layerStack.length === 0) {
            html += `<span class="crumb active">Brain</span>`;
    } else {
        layerStack.forEach((layer) => {
            html += `<span class="crumb" onclick="goToLayer('${layer.id}')">${layer.title}</span>`;
            html += `<span class="crumb-separator">/</span>`;
        });
        let displayTitle = activeTitleOverride;
        if (!displayTitle && currentLayerID !== 'root') {
                if (layerStorage[currentLayerID].type === 'text') displayTitle = docTitle.value;
                else displayTitle = "Camada";
        }
        html += `<span class="crumb active">${displayTitle || 'Atual'}</span>`;
    }
    breadcrumbsBar.innerHTML = html;
}

// --- DUPLO CLIQUE (ROTEADOR) ---
viewport.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.card');
    if (card) {
        e.stopPropagation();
        
        const contentDiv = card.querySelector('.card-content') || card; 
        const isTextType = contentDiv.getAttribute('data-type') === 'text';
        const layerType = isTextType ? 'text' : 'canvas';
        
        let title = card.querySelector('h2') ? card.querySelector('h2').innerText : 'Sem Nome';
        
        card.style.transform += " scale(1.1)";
        
        setTimeout(() => {
            enterLayer(card.id, title, layerType, card);
        }, 100);
    }
});

// --- CORE CANVAS EVENTS ---
function draw() {
    world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    viewport.style.backgroundPosition = `${state.x}px ${state.y}px`;
    viewport.style.backgroundSize = `${40 * state.scale}px ${40 * state.scale}px`;
    document.getElementById('zoom-level').innerText = Math.round(state.scale * 100) + '%';
}

viewport.addEventListener('mousedown', (e) => {
    if (e.button === 2) return; 
    hideContextMenu();
    if (e.button === 1) { e.preventDefault(); startPan(e); return; }
    if (e.button === 0) {
        const card = e.target.closest('.card');
        if (e.target.isContentEditable) return; 
        if (card) startDragCard(e, card); else startPan(e);
    }
});

window.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
        e.preventDefault(); state.x = e.clientX - state.panStartX; state.y = e.clientY - state.panStartY; draw();
    }
    if (state.draggedCard) {
        e.preventDefault();
        const dX = e.clientX - state.mouseStartX; const dY = e.clientY - state.mouseStartY;
        const nX = state.cardStartX + (dX / state.scale); const nY = state.cardStartY + (dY / state.scale);
        state.draggedCard.style.transform = `translate(${nX}px, ${nY}px)`;
        state.draggedCard.setAttribute('data-x', nX); state.draggedCard.setAttribute('data-y', nY);
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
    const d = -Math.sign(e.deltaY); const s = Math.min(Math.max(0.1, state.scale + (d * 0.1)), 5);
    const mX = e.clientX; const mY = e.clientY; 
    state.x -= (mX - state.x) * (s / state.scale - 1); state.y -= (mY - state.y) * (s / state.scale - 1);
    state.scale = s; draw();
}, { passive: false });

function startPan(e) { state.isPanning = true; state.panStartX = e.clientX - state.x; state.panStartY = e.clientY - state.y; viewport.style.cursor = 'grabbing'; }
function startDragCard(e, card) { state.draggedCard = card; state.mouseStartX = e.clientX; state.mouseStartY = e.clientY; state.cardStartX = parseFloat(card.getAttribute('data-x')); state.cardStartY = parseFloat(card.getAttribute('data-y')); card.classList.add('dragging'); e.stopPropagation(); }

// --- CONEXÕES ---
function updateLines(movedCardID) {
    currentConnections.forEach(conn => {
        if (conn.from === movedCardID || conn.to === movedCardID) {
            const el1 = document.getElementById(conn.from); const el2 = document.getElementById(conn.to);
            if (el1 && el2) drawSVGPath(conn.line, el1, el2);
        }
    });
}
function drawSVGPath(path, el1, el2) {
    const off = 50000;
    const x1 = parseFloat(el1.getAttribute('data-x')) + el1.offsetWidth/2; const y1 = parseFloat(el1.getAttribute('data-y')) + el1.offsetHeight/2;
    const x2 = parseFloat(el2.getAttribute('data-x')) + el2.offsetWidth/2; const y2 = parseFloat(el2.getAttribute('data-y')) + el2.offsetHeight/2;
    const sx = x1+off; const sy = y1+off; const ex = x2+off; const ey = y2+off; const dist = Math.abs(ex-sx)*0.5;
    path.setAttribute('d', `M ${sx} ${sy} C ${sx+dist} ${sy}, ${ex-dist} ${ey}, ${ex} ${ey}`);
}

// --- MENU CONTEXTO ---
window.addEventListener('contextmenu', (e) => {
    e.preventDefault(); const card = e.target.closest('.card');
    if (card) { contextTargetID = card.id; showContextMenu(e.clientX, e.clientY, true); } else hideContextMenu();
});

function showContextMenu(x, y, isCard) {
    contextMenu.style.display = 'block'; contextMenu.style.left = x + 'px'; contextMenu.style.top = y + 'px'; contextMenu.innerHTML = ''; 
    if (isCard) {
        const btnConn = document.createElement('div'); btnConn.className = 'menu-item'; btnConn.innerText = '🔗 Conectar'; btnConn.onclick = window.openConnectionPicker; contextMenu.appendChild(btnConn);
        // Botão Excluir
        const btnDel = document.createElement('div'); btnDel.className = 'menu-item'; btnDel.innerText = '🗑️ Excluir'; btnDel.style.color='#ff5555'; 
        btnDel.onclick = () => { 
            const card = document.getElementById(contextTargetID); 
            if(card) {
                // Remove linhas visuais
                currentConnections.forEach(conn => {
                    if (conn.from === contextTargetID || conn.to === contextTargetID) conn.line.remove();
                });
                // Remove card visual
                card.remove(); 
            }
            // Limpa dados
            currentConnections = currentConnections.filter(c => c.from!==contextTargetID && c.to!==contextTargetID); 
            hideContextMenu();
        }; 
        contextMenu.appendChild(btnDel);
    }
}
function hideContextMenu() { contextMenu.style.display = 'none'; }
window.openConnectionPicker = function() { hideContextMenu(); connectionPicker.style.display = 'block'; pickerList.innerHTML = ''; document.querySelectorAll('.card').forEach(c => { if(c.id!==contextTargetID){ const d = document.createElement('div'); d.className='picker-option'; d.innerText=c.querySelector('h2').innerText; d.onclick=()=>{ createConn(c.id); }; pickerList.appendChild(d); } }); };
window.closePicker = function() { connectionPicker.style.display = 'none'; };
function createConn(toID) { 
    const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.className='connector-line'; svgLayer.appendChild(path);
    currentConnections.push({from:contextTargetID, to:toID, line:path}); 
    drawSVGPath(path, document.getElementById(contextTargetID), document.getElementById(toID)); window.closePicker(); 
}

// Inicializa
draw();
