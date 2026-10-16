# Biblioteca Lúdica II — C1: Cloudflare Worker + D1 + R2 (experimental)

Este diretório é uma **prova técnica isolada**, não uma implantação de produção. Não acessa nem altera a Biblioteca atual do GitHub Pages, o Google Drive, o catálogo ou livros reais. O C1 usa uma estante fictícia e um arquivo de texto fictício.

## O que já foi implementado

- Worker HTTP (`src/index.js`) com endpoints de saúde, leitura da estante e leitura de um livro fictício.
- Banco D1 (`migrations/0001_create_c1_demo.sql`) com uma estante e um número de revisão.
- Escrita de nome de estante com controle de versão; conflito retorna HTTP 409 em vez de sobrescrever a edição de outro navegador.
- Objeto fictício de texto no R2, acessível pela API sem tornar o bucket público.
- Escritas protegidas por segredo de teste (`C1_ADMIN_TOKEN`), que não deve ser publicado ou enviado no chat.
- Testes automatizados locais com simulação de D1 e R2 (não substituem uma implantação real).

## Preparação local e implantação (quando autorizado)

Requer Node.js 20+ e conta Cloudflare. **Não execute os passos remotos antes de confirmar os recursos e as condições de cobrança.** O armazenamento R2 pode exigir ativação de faturamento no painel. Não há motivo para fornecer credenciais ao ChatGPT.

```bash
npm install
npm test
npx wrangler login
npx wrangler d1 create bl2-c1-teste-d1
npx wrangler r2 bucket create bl2-c1-teste-r2
```

Copie o `database_id` retornado pelo comando D1 para `wrangler.jsonc`, substituindo `SUBSTITUIR_PELO_UUID_D1`. Mantenha os nomes `bl2-c1-teste-d1` e `bl2-c1-teste-r2` separados de quaisquer recursos de produção.

Para inicializar localmente:

```bash
npx wrangler d1 migrations apply DB --local
```

Crie, **somente em seu computador**, `.dev.vars` com um segredo aleatório de pelo menos 32 caracteres:

```
C1_ADMIN_TOKEN=COLE_AQUI_UM_SEGREDO_ALEATORIO_FORTE_COM_32_OU_MAIS_CARACTERES
```

Execute `npm run dev` e teste `http://127.0.0.1:8787/api/health` e `/api/shelf`. Esses testes locais não mexem em dados reais da conta.

Somente quando a execução remota for autorizada, configure o segredo no Cloudflare (o CLI pergunta o valor sem o inserir no GitHub):

```bash
npx wrangler secret put C1_ADMIN_TOKEN
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
```

**Nota:** caso o comando de segredo precise que o Worker já exista, faça o primeiro deploy com as rotas administrativas protegidas (elas recusam solicitações enquanto `C1_ADMIN_TOKEN` não estiver configurado), defina o segredo e depois teste. Nenhum segredo deve ser colocado em `wrangler.jsonc`.

## Rotas

| Método | Caminho | Acesso | Função |
|---|---|---|---|
| GET | `/api/health` | Público | Testa ligação D1 e R2 |
| GET | `/api/shelf` | Público | Obtém estante e versão |
| PATCH | `/api/admin/shelf` | Segredo | Altera nome e exige `expectedVersion` |
| POST | `/api/admin/demo-book` | Segredo | Coloca texto fictício no bucket R2 |
| GET | `/api/demo-book` | Público | Lê o objeto fictício via Worker |

Exemplo de escrita via terminal (sem publicar o segredo no código ou copiar o comando já preenchido para outras pessoas):

```bash
curl -X PATCH 'https://SEU-WORKER.workers.dev/api/admin/shelf' \
  -H 'Authorization: Bearer SEU_SEGREDO_DE_TESTE' \
  -H 'Content-Type: application/json' \
  --data '{"title":"Estante de teste atualizada","expectedVersion":1}'
```

Receberá `409` se outro navegador já tiver atualizado a versão 1. Em produção, esse segredo temporário deverá ser substituído por autenticação de administrador real e autorização por sessão (Marco C3).

## Regras de proteção

- Não usar um EPUB real neste marco. Não importar dados da ADM-001 ou do Google Drive.
- Não criar rota administrativa sem autenticação.
- CORS permite a origem oficial do GitHub Pages; clientes não navegador ainda precisam do segredo para escrever.
- `wrangler.jsonc` contém um **marcador de UUID**; não contém token, Client Secret, chave R2 nem cookie.
- O Worker não faz migração da Biblioteca antiga. Isso só será planejado após C1 e C2 aprovados.

## Critérios para encerrar C1

1. A infraestrutura isolada responde `/api/health` com D1 e R2 operacionais.
2. Um cliente consegue ler a estante fictícia.
3. Uma escrita autorizada no navegador A aumenta sua versão e passa a aparecer no navegador B sem reconstrução de backups.
4. Duas escritas simultâneas baseadas na mesma versão não apagam uma à outra: uma responde `409`.
5. O Worker grava e serve somente o arquivo fictício no R2.
6. Nenhum dos testes altera a `main` do GitHub Pages, o catálogo real, o Google Drive ou os livros já existentes.
