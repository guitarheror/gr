// --- CORE.JS: O Motor do Workspace ---

const Core = {
    // Estado Global
    viewport: document.getElementById('viewport'),
    container: document.getElementById('workspace-container'),
    elementsLayer: document.getElementById('elements-layer'),
    menuContainer: document.getElementById('menu-items-container'),
    
    state: {
        scale: 1,
        panX: 0, panY: 0,
        isDraggingSpace: false,
        startX: 0, startY: 0,
        currentParentId: 'root',
        elements: { 'root': { id: 'root', type: 'root', children: [], connections: [] } }
    },

    // Registro de Plugins (Aqui que a mágica acontece)
    plugins: {},

    registerPlugin: function(type, definition) {
        this.plugins[type] = definition;
        console.log(`Plugin carregado: ${type}`);
        this.addMenuButton(type, definition);
    },

    // Inicialização
    init: function() {
        this.setupEvents();
        this.render();
        this.updateTransform();
        console.log("Core v4.0 Inicializado");
    },

    // Adiciona botão no menu automaticamente
    addMenuButton: function(type, def) {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `<span class="material-symbols-outlined menu-icon">${def.icon}</span><span class="menu-text">${def.label}</span>`;
        div.onclick = () => {
            this.createElement(type);
            document.getElementById('add-menu').classList.add('hidden');
        };
        this.menuContainer.appendChild(div);
    },

    // Criação de Elemento Genérico
    createElement: function(type) {
        const plugin = this.plugins[type];
        if (!plugin) return;

        const id = 'el_' + Date.now();
        // Dados básicos que todo elemento tem
        const baseData = {
            id: id, type: type,
            x: (window.innerWidth/2 - this.state.panX)/this.state.scale - 100,
            y: (window.innerHeight/2 - this.state.panY)/this.state.scale - 75,
            width: 250, height: 180,
            children: [], connections: [],
            ...plugin.defaultData // Dados específicos do plugin (ex: texto, cor)
        };

        this.state.elements[id] = baseData;
        this.state.elements[this.state.currentParentId].children.push(id);
        this.render();
    },

    // Renderização
    render: function() {
        this.elementsLayer.innerHTML = '';
        const parent = this.state.elements[this.state.currentParentId];
        
        // Verifica se o pai atual é um plugin que exige renderização customizada (Split View)
        const parentPlugin = this.plugins[parent.type];
        if (parentPlugin && parentPlugin.renderInside) {
            parentPlugin.renderInside(parent, this.elementsLayer);
            return; // O plugin assume o controle da tela
        } else {
            // Renderização Padrão (Grid)
            this.container.style.display = 'block';
             // Limpa split views antigos se houver
            const split = document.getElementById('split-view-container');
            if(split) split.remove();
        }

        // Renderiza os filhos
        parent.children.forEach(childId => {
            const data = this.state.elements[childId];
            if (data) this.renderElementDOM(data);
        });
        
        this.updateBreadcrumbs();
    },

    renderElementDOM: function(data) {
        const div = document.createElement('div');
        div.className = 'workspace-element';
        div.id = data.id;
        div.style.left = data.x + 'px';
        div.style.top = data.y + 'px';
        div.style.width = data.width + 'px';
        div.style.height = data.height + 'px';

        // O Plugin decide o que vai DENTRO do quadrado
        const plugin = this.plugins[data.type];
        if (plugin) {
            div.innerHTML = plugin.renderPreview(data);
        }

        // Lógica de Arrastar (Genérica do Core)
        div.addEventListener('mousedown', (e) => this.handleElementDrag(e, data));
        div.addEventListener('dblclick', (e) => { e.stopPropagation(); this.enterElement(data.id); });
        
        this.elementsLayer.appendChild(div);
    },

    // Navegação
    enterElement: function(id) {
        this.state.currentParentId = id;
        this.state.scale = 1; this.state.panX = 0; this.state.panY = 0;
        this.render();
        this.updateTransform();
    },

    updateTransform: function() {
        this.container.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.scale})`;
    },

    // Eventos Básicos (Resumido para caber aqui, mas inclui a lógica da rodinha e drag)
    setupEvents: function() {
        // Toggle Menu +
        document.getElementById('add-button').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('add-menu').classList.toggle('hidden');
        });

        // Pan e Zoom (Lógica padrão v2.4)
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY);
            const zoomFactor = 1 + (delta * 0.1);
            this.state.scale = Math.max(0.1, Math.min(5, this.state.scale * zoomFactor));
            this.updateTransform();
        }, {passive:false});

        this.viewport.addEventListener('mousedown', (e) => {
            if(e.button === 1) { // Rodinha
                e.preventDefault();
                this.state.isDraggingSpace = true;
                this.state.startX = e.clientX - this.state.panX;
                this.state.startY = e.clientY - this.state.panY;
                this.viewport.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if(this.state.isDraggingSpace) {
                e.preventDefault();
                this.state.panX = e.clientX - this.state.startX;
                this.state.panY = e.clientY - this.state.startY;
                this.updateTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            this.state.isDraggingSpace = false;
            this.viewport.style.cursor = 'default';
        });
    },

    handleElementDrag: function(e, data) {
        if(e.button !== 0) return;
        e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        const initialX = data.x; const initialY = data.y;

        const move = (ev) => {
            const dx = (ev.clientX - startX) / this.state.scale;
            const dy = (ev.clientY - startY) / this.state.scale;
            data.x = initialX + dx;
            data.y = initialY + dy;
            const el = document.getElementById(data.id);
            if(el) { el.style.left = data.x+'px'; el.style.top = data.y+'px'; }
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    },
    
    updateBreadcrumbs: function() {
        document.getElementById('breadcrumb-text').innerText = this.state.currentParentId === 'root' ? 'Workspace' : 'Workspace / ... / ' + this.state.elements[this.state.currentParentId].name;
    }
};

// Inicia o Core quando a página carregar
document.addEventListener('DOMContentLoaded', () => Core.init());
