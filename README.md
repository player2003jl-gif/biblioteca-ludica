# Biblioteca Lúdica II — ADM-001, etapa 1 — v0.5.17 experimental

**Base:** checkpoint v0.5.16, preservado integralmente.

## O que foi implementado

No modo Administração, há uma área `Preservação administrativa · ADM-001` com:

- **Exportar backup integral (.zip)**: inclui o layout v7, dimensões de salas, portas, móveis, NPC, objetos, modos de interação, chaves locais `BL2_` e `bl2-`, configurações do IndexedDB, registros bibliográficos e todos os arquivos EPUB/PDF importados armazenados no IndexedDB.
- **Restaurar backup integral (.zip)**: exige confirmação, valida formato, schema, nomes de arquivos, tamanhos e SHA-256 de cada obra antes de alterar qualquer dado, verifica compatibilidade da planta e usa transação atômica para os livros e configurações. Em caso de falha tenta recuperar os dados anteriores.
- Compatibilidade: chaves `BL2_layout_044_TWO_ROOMS` e `bl2-catalog-v03` preservadas. Leitura, sprites e módulos consolidados continuam iguais.

## Como usar no GitHub Pages

1. Guarde cópias do checkpoint v0.5.16. No site atualmente publicado **v0.5.16**, use Administração > Salvar ambiente e **Exportar JSON**, e guarde também os EPUBs originais; a função de backup integral só aparece na v0.5.17.
2. Na sua conta GitHub, abra o repositório `player2003jl-gif/biblioteca-ludica`.
3. Faça upload dos arquivos extraídos do pacote público v0.5.17, substituindo `index.html` e mantendo `.nojekyll` e `README.md`. Não envie o ZIP de checkpoint ou backups do administrador ao repositório público.
4. Verifique o GitHub Pages no mesmo endereço `https://player2003jl-gif.github.io/biblioteca-ludica/` e teste os ambientes.
5. Entre em Administração > Salvar ambiente > **Exportar backup integral (.zip)** e guarde o arquivo em pasta privada do seu computador. Teste a restauração em perfil de navegador separado antes de confiar nele como único backup.

## O que NÃO está implementado

- Sincronização automática com Google Drive, GitHub ou entre dispositivos.
- Autenticação/administração remota com acesso exclusivo: **o GitHub Pages é público e o editor nesta versão permanece local ao navegador**.
- Migração automática entre esquemas futuros ainda não conhecidos. Formatos novos precisarão de migrações verificáveis.
- Garantia de preservação se o usuário apagar dados do navegador, trocar domínio/origem ou utilizar armazenamento privado/incógnito sem backup.

**Segurança:** o backup pode conter EPUBs e anotações privadas. Nunca envie esses arquivos ao repositório público. Para portabilidade, use somente obras que você possui e tem autorização de armazenar/distribuir, respeitando direitos autorais.

**Limitação de homologação:** testes de contrato e sintaxe passaram; o Chromium disponível bloqueou toda navegação de teste por política administrativa (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). Por isso ainda falta testar visualmente exportação/restauração em navegadores reais. A versão atual no GitHub não foi modificada automaticamente.
