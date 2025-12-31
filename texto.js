// plugins/texto.js

if (window.registerPlugin && window.spawnCardAtCenter) {
    window.registerPlugin('📝', 'Criar Nota', () => {
        // CRUCIAL: Adicionei a classe 'type-text' na div principal do conteúdo.
        // Removi 'contenteditable="true"' dos h2 e p.
        window.spawnCardAtCenter(`
            <div class="card-content type-text">
                <h2>Título da Nota</h2>
                <p>Duplo clique para abrir o editor...</p>
            </div>
        `);
    });
} else {
    console.error("Erro: Core não carregado.");
}
