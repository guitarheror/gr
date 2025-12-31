if (window.registerPlugin && window.spawnCardAtCenter) {
    window.registerPlugin('📝', 'Criar Nota', () => {
        // data-type="text" avisa o sistema que isso é um documento
        window.spawnCardAtCenter(`
            <div class="card-content" data-type="text">
                <h2>Nova Nota</h2>
                <p>Duplo clique para escrever...</p>
            </div>
        `);
    });
}
