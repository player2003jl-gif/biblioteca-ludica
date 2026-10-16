# C1 — Primeiro Worker Cloudflare (homologação)

Este Worker possui somente GET / e GET /api/health. Não contém autenticação administrativa nem dados de biblioteca, não altera catálogo, planta, livros, D1, R2, GitHub Pages ou Drive.

Nome exclusivo: `bl2-c1-verificacao`. Implantação na Cloudflare via workflow isolado da branch `infra-c1-cloudflare-20261016`.

O endpoint retorna explicitamente `database: not-configured` e `storage: not-configured` para evitar impressão de que os serviços já funcionam.

Testes: `node --test backend/c1-cloudflare/health-worker/test/*.test.mjs`.

Caso a conta não tenha domínio `workers.dev` habilitado, a implantação pode falhar e será necessária uma configuração inicial no painel (não ativar Pages nem domínios próprios).
