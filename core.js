const Brain = {
    // Estado do nosso mundo
    state: {
        scale: 1,       // Nível de zoom atual
        x: 0,           // Posição horizontal do mundo
        y: 0,           // Posição vertical do mundo
        isPanning: false, // Se estamos arrastando o fundo
        startX: 0,      // Posição inicial do mouse ao começar a arrastar
        startY: 0
    },

    // Configurações
    config: {
        minScale: 0.1,  // Zoom mínimo (10%)
        maxScale: 5,    // Zoom máximo (500%)
        zoomSpeed: 0.001 // Sensibilidade da roda do mouse
    },

    // Referências ao DOM
    viewport: document.getElementById('viewport'),
    world: document.getElementById('world'),

    // Inicialização
    init() {
        // Desabilita o menu de contexto padrão do navegador (botão direito)
        // para podermos usar o nosso próprio no futuro.
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        this.addEventListeners();
        this.updateTransform();
        console.log("Brain 0.1 iniciado. Workspace infinito pronto.");
    },

    addEventListeners() {
        // --- Zoom (Roda do Mouse) ---
        this.viewport.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // --- Pan (Arrastar o fundo com botão esquerdo) ---
        this.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    },

    // Lógica do Zoom no Cursor
    handleWheel(e) {
        e.preventDefault();

        // 1. Calcula a posição do mouse relativa ao viewport
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 2. Calcula o ponto no "mundo" onde o mouse está antes do zoom
        const worldXBeforeZoom = (mouseX - this.state.x) / this.state.scale;
        const worldYBeforeZoom = (mouseY - this.state.y) / this.state.scale;

        // 3. Aplica o zoom (baseado na direção da roda)
        // Usamos exponencial para um zoom mais suave
        const zoomFactor = Math.exp(-e.deltaY * this.config.zoomSpeed);
        let newScale = this.state.scale * zoomFactor;

        // Limita o zoom entre o mínimo e máximo definidos
        newScale = Math.min(Math.max(newScale, this.config.minScale), this.config.maxScale);
        
        // Atualiza o estado do scale
        this.state.scale = newScale;

        // 4. Calcula a nova posição do mundo para que o ponto sob o mouse não se mova
        this.state.x = mouseX - worldXBeforeZoom * newScale;
        this.state.y = mouseY - worldYBeforeZoom * newScale;

        this.updateTransform();
    },

    // Lógica do Pan (Arrastar)
    handleMouseDown(e) {
        // Verifica se é o botão esquerdo (button 0)
        // E se clicamos no fundo (não em um elemento futuro ou UI)
        if (e.button === 0 && (e.target === this.viewport || e.target === this.world)) {
            this.state.isPanning = true;
            // Guarda onde o mouse estava quando começamos a arrastar
            this.state.startX = e.clientX - this.state.x;
            this.state.startY = e.clientY - this.state.y;
            this.viewport.style.cursor = 'grabbing';
        }
        
        // Placeholder para o clique com botão direito (future menu)
        if (e.button === 2) {
            console.log("Botão direito clicado. (Reservado para Menu de Contexto)");
            // Aqui abriremos o menu flutuante no futuro
        }
    },

    handleMouseMove(e) {
        if (!this.state.isPanning) return;
        e.preventDefault();
        
        // Atualiza a posição do mundo baseado no movimento do mouse
        this.state.x = e.clientX - this.state.startX;
        this.state.y = e.clientY - this.state.startY;
        
        this.updateTransform();
    },

    handleMouseUp() {
        if (this.state.isPanning) {
            this.state.isPanning = false;
            this.viewport.style.cursor = 'grab';
        }
    },

    // Aplica os cálculos matemáticos ao CSS
    updateTransform() {
        // Usamos translate3d para melhor performance (aceleração de hardware)
        this.world.style.transform = `translate3d(${this.state.x}px, ${this.state.y}px, 0) scale(${this.state.scale})`;
    }
};

// Liga o motor
Brain.init();
