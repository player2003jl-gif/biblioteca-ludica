# Biblioteca Lúdica II — v0.5.19 ADM-003 (ramificação de teste)

Esta ramificação `teste-v0519-adm003` contém o HTML completo da v0.5.19, sem modificar a ramificação principal `main`, que permanece na v0.5.18 ADM-002.

## O que foi preparado

- Recuperação automática de revisões administrativas do Google Drive após autenticação, quando não há alterações locais pendentes nem edição em andamento.
- Sincronização automática após salvar e consulta periódica a revisões remotas.
- Preservação de alterações offline e bloqueio conservador de conflitos, sem exclusão de versões anteriores.
- Preservação dos módulos gráficos e do Hub EPUB V3.
- Backup ZIP ADM-001 mantido.

## Integridade

`index.html` tem SHA-256 `76cb82bb90831664a94f700b7c0df3f514e42bdc3bc6e79dbd3aa38e98f16647` e Git blob SHA `210f8ed45fa1e920fa118385f2608aceb8af0ddb`.

O GitHub Actions reconstruiu este arquivo a partir de um patch compactado que está em `tools/adm003-index.patch.xz.b64`, com verificação SHA-256. A ramificação principal não foi alterada.

## Como testar

A branch não substitui automaticamente o site público. Use um preview do GitHub Pages, caso habilitado para essa branch, ou baixe os arquivos da branch para execução local. Na avaliação do Google Drive, exporte primeiro um backup privado ADM-001 e use uma conta de testes; confira recuperação entre navegadores, conflitos e reconexão offline.

**Limite:** testes simulados não substituem homologação OAuth/Google Drive real. Não publique credenciais, backups ou EPUBs privados no repositório público.
