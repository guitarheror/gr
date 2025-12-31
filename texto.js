// Plugin de Nota de Texto Simples
if (window.registerPlugin) {
    window.registerPlugin('📝', 'Criar Nota', () => {
        window.spawnCardAtCenter(`
            <h2 contenteditable="true">Nota</h2>
            <p contenteditable="true">Clique para editar...</p>
        `);
    });
} else {
    console.error("Erro: O Core do Canvas não foi carregado ainda.");
}
