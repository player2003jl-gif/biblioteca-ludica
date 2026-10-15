# Biblioteca Lúdica II — ADM-002 (v0.5.18 experimental)

Aplicação online para GitHub Pages derivada do checkpoint v0.5.16 e da v0.5.17 ADM-001.

**Conteúdo público:** `index.html`, `.nojekyll` e este README. Nenhum EPUB de demonstração, token, segredo ou backup administrativo está incorporado à versão web.

## Sincronização Google Drive

- Cliente OAuth de **Aplicativo Web** configurado pelo administrador em https://console.cloud.google.com/; origem autorizada `https://player2003jl-gif.github.io`.
- Google Drive API ativada no projeto OAuth e `drive.appdata` solicitado com consentimento.
- No modo Administração, informar **somente o Client ID (público)**, conectar e escolher entre enviar estado local ou restaurar último estado salvo no Drive.
- As versões administrativas são JSONs imutáveis; arquivos EPUB/PDF são armazenados no `appDataFolder`, com nome baseado no SHA-256 para impedir reuploads de conteúdo igual. Nenhum arquivo da conta Google é publicado pelo GitHub.
- Depois do primeiro envio, alterações explicitamente salvas na Administração serão sincronizadas enquanto a conta permanecer conectada e a página estiver aberta. Uma versão mais recente em outro computador bloqueia novos envios até o administrador resolver o conflito.
- Tokens OAuth ficam apenas na memória; após expiração ou reinício da página será preciso reconectar.

**Esta distribuição NÃO contém autenticação própria de administração.** O site é público; pessoas podem usar o editor localmente no próprio navegador, mas somente quem autoriza a conta Google com o cliente OAuth permitido poderá criar/recuperar snapshots em sua conta. Para limitar o consentimento OAuth aos responsáveis durante testes, use público Externo / Testing e a lista de usuários de teste no Google Cloud.

**Importante:** a sincronização não publica o catálogo para visitantes. O Drive usa uma pasta oculta, privada por aplicativo. Continue usando o ZIP de backup ADM-001 para cópias independentes. O serviço Google Identity precisa de internet, mas os demais módulos offline continuam funcionando.

## Publicação

Em `https://github.com/player2003jl-gif/biblioteca-ludica`, substitua o `index.html` pela versão deste pacote, mantendo a branch `main` e o GitHub Pages em `/(root)`. Guarde em privado o checkpoint, backups, livros e credenciais.

Esta versão não passou por autenticação real numa conta Google: os fluxos OAuth/Drive foram testados com respostas simuladas; a ativação depende do Client ID do administrador e da sua conferência manual.
