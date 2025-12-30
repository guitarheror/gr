const Brain = {
    state: {
        scale: 1,
        x: 0,
        y: 0,
        isPanning: false,
        startX: 0,
        startY: 0
    },

    viewport: document.getElementById('viewport'),
    world: document.getElementById('world'),

    init() {
        this.addEventListeners();
        // Inicializa centralizado (opcional, ajustei para 0,0 por enquanto)
        this.updateTransform();
    },

    addEventListeners() {
        // Zoom
        this.viewport.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Pan (Arrastar)
        this.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    },

    handleWheel(e) {
        e.preventDefault();

        // Pega a posição do mouse relativa ao viewport (desconta a sidebar)
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calcula coordenadas do mundo antes do zoom
        const worldX = (mouseX - this.state.x) / this.state.scale;
        const worldY = (mouseY - this.state.y) / this.state.scale;

        // Fator de Zoom
        const zoomIntensity = 0.001;
        const zoomFactor = Math.exp(-e.deltaY * zoomIntensity);
        
        // Limites de Zoom
        const newScale = Math.min(Math.max(this.state.scale * zoomFactor, 0.1), 10);

        // Atualiza estado
        this.state.scale = newScale;
        this.state.x = mouseX - worldX * newScale;
        this.state.y = mouseY - worldY * newScale;

        this.updateTransform();
    },

    handleMouseDown(e) {
        // Botão Esquerdo (0) ou Meio (1)
        if (e.button === 0 || e.button === 1) {
            this.state.isPanning = true;
            this.state.startX = e.clientX - this.state.x;
            this.state.startY = e.clientY - this.state.y;
            this.viewport.style.cursor = 'grabbing';
        }
    },

    handleMouseMove(e) {
        if (!this.state.isPanning) return;
        e.preventDefault();
        this.state.x = e.clientX - this.state.startX;
        this.state.y = e.clientY - this.state.startY;
        this.updateTransform();
    },

    handleMouseUp() {
        this.state.isPanning = false;
        this.viewport.style.cursor = 'grab';
    },

    updateTransform() {
        // Aplica o movimento e zoom
        this.world.style.transform = `translate3d(${this.state.x}px, ${this.state.y}px, 0) scale(${this.state.scale})`;
        
        // Atualiza a posição do background (Grid) para dar sensação de infinito
        // Isso faz com que os pontos se movam corretamente
        this.world.style.backgroundPosition = `${this.state.x}px ${this.state.y}px`;
        this.world.style.backgroundSize = `${32 * this.state.scale}px ${32 * this.state.scale}px`;
    }
};

Brain.init();
