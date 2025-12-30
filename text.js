// --- PLUGIN: ELEMENTO DE TEXTO ---

Core.registerPlugin('text', {
    // 1. Configurações Básicas
    label: 'Text',
    icon: 'title', // Ícone do Google Fonts
    
    // 2. Dados Padrão (Quando cria um novo)
    defaultData: {
        name: 'Untitled Text',
        content: 'Start typing...',
        locked: false
    },

    // 3. Como ele aparece no Workspace (Miniatura)
    renderPreview: function(data) {
        return `
            <div style="padding:10px; height:100%; display:flex; flex-direction:column; overflow:hidden;">
                <strong style="color:#4CAF50; font-size:14px; margin-bottom:5px;">${data.name}</strong>
                <div style="color:#ccc; font-size:12px;">${data.content}</div>
            </div>
        `;
    },

    // 4. Como ele aparece quando entramos nele (Split View)
    renderInside: function(data, targetLayer) {
        // Esconde o grid padrão do Core
        Core.container.style.display = 'none';

        // Cria a Interface Split View
        const split = document.createElement('div');
        split.id = 'split-view-container';
        split.innerHTML = `
            <div id="editor-pane" style="width:40%; height:100%; background:#050505; border-right:1px solid #333; padding:40px; color:white;">
                <h2 style="color:#4CAF50; margin-bottom:20px;">Editing: ${data.name}</h2>
                <textarea id="plugin-textarea" style="width:100%; height:80%; background:transparent; border:none; color:#ddd; font-size:16px; outline:none;">${data.content}</textarea>
            </div>
            <div id="nested-preview" style="flex-grow:1; position:relative; background:#000;">
                <div style="position:absolute; top:20px; left:20px; color:#666;">
                    Preview do Workspace Interno (Funcionalidade futura)
                </div>
            </div>
        `;
        
        // Adiciona ao DOM
        document.getElementById('viewport').appendChild(split);

        // Lógica Específica do Plugin (Salvar texto)
        const textarea = split.querySelector('#plugin-textarea');
        textarea.addEventListener('input', (e) => {
            data.content = e.target.value;
        });

        // Botão de Voltar customizado ou usar o Breadcrumb do Core
        // O breadcrumb do Core já funciona para sair daqui
    }
});
