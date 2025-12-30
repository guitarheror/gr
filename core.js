const Brain = {
    state: {
        scale: 1,
        x: 0,
        y: 0,
        isPanning: false,
        startX: 0,
        startY: 0
    },

    config: {
        minScale: 0.1,
        maxScale: 5,
        zoomSpeed: 0.001
    },

    viewport: document.getElementById('viewport'),
    world: document.getElementById('world'),

    init() {
        // Prevenir menu de contexto nativo
        document.addEventListener('contextmenu', e => e.preventDefault());
        this.addEventListeners();
        this.updateTransform();
    },

    addEventListeners() {
        this.viewport.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    },

    handleWheel(e) {
        e.preventDefault();
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldXBeforeZoom = (mouseX - this.state.x) / this.state.scale;
        const worldYBeforeZoom = (mouseY - this.state.y) / this.state.scale;
        
        const zoomFactor = Math.exp(-e.deltaY * this.config.zoomSpeed);
        let newScale = this.state.scale * zoomFactor;
        newScale = Math.min(Math.max(newScale, this.config.minScale), this.config.maxScale);
        
        this.state.scale = newScale;
        this.state.x = mouseX - worldXBeforeZoom * newScale;
        this.state.y = mouseY - worldYBeforeZoom * newScale;

        this.updateTransform();
    },

    handleMouseDown(e) {
        // Botão Esquerdo (0) para arrastar o fundo
        if (e.button === 0 && (e.target === this.viewport || e.target === this.world)) {
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
        if (this.state.isPanning) {
            this.state.isPanning = false;
            this.viewport.style.cursor = 'grab';
        }
    },

    updateTransform() {
        this.world.style.transform = `translate3d(${this.state.x}px, ${this.state.y}px, 0) scale(${this.state.scale})`;
    }
};

Brain.init();
