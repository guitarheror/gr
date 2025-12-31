// Plugin de Pasta/Projeto (que permite entrar na camada)
if (window.registerPlugin) {
    window.registerPlugin('📁', 'Novo Projeto', () => {
        window.spawnCardAtCenter(`
            <h2 contenteditable="true" style="color: #bb86fc;">Projeto</h2>
            <p>Duplo Clique para abrir a pasta.</p>
        `);
    });
}
