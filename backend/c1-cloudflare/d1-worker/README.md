# C1 — Estante fictícia no Cloudflare D1

Ambiente separado do site principal. Banco fixo: `bl2-c1-teste-d1`; Worker de leitura: `bl2-c1-d1-verificacao`.

- `GET /api/health`: consulta `SELECT 1` no banco D1 real.
- `GET /api/shelf`: lê uma única estante fictícia e seu número de revisão.
- Nenhuma escrita HTTP nesta fase. O catálogo público, layout, Google Drive e EPUBs não são utilizados.
- Migração SQL inclui apenas a tabela `shelves` e sua estante fictícia.
- R2 permanece desativado, sem solicitar faturamento.

## Implantação
O workflow `.github/workflows/c1-criar-d1-e-verificar.yml` consulta a API Cloudflare em busca do banco de nome exato e **só o cria se não existir**. Em seguida, injeta o UUID no Wrangler em tempo de execução, aplica a migração exclusivamente no banco experimental, implanta o Worker experimental e verifica os endpoints HTTPS.

Não modificar o nome do banco sem nova revisão de segurança. A escrita autorizada entre navegadores virá depois da validação desta etapa.
