# Biblioteca Lúdica II — v0.5.16 (pacote de publicação)

Versão web de testes, derivada do checkpoint de 15/10/2026. Não substitui o checkpoint original.

## Conteúdo

- `index.html`: aplicação em arquivo único (CSS, JavaScript e imagens incorporados).
- `.nojekyll`: desativa o processamento Jekyll no GitHub Pages.
- `README.md`: orientações de publicação.

## Publicação pelo GitHub Pages

**ATENÇÃO: GitHub Pages no plano GitHub Free requer repositório público. Não há proteção por login equivalente ao Cloudflare Access. Não habilite Pages se precisar manter a biblioteca privada.**

1. Crie um repositório com nome `biblioteca-ludica-ii` em https://github.com/new.
2. Comece com visibilidade **Private**, enquanto define o modelo de acesso.
3. Use `Add file > Upload files` para enviar os arquivos extraídos deste pacote. O `index.html` tem 20.9 MB; o upload web costuma aceitar arquivos de até 25 MiB.
4. Confirme o commit dos arquivos.
5. **Somente após autorizar a publicação pública**: torne o repositório público (se estiver no plano GitHub Free), abra `Settings > Pages`, configure `Deploy from a branch`, `main`, pasta `/ (root)` e salve.
6. O URL de projeto será da forma `https://SEU_USUARIO.github.io/biblioteca-ludica-ii/`.
7. Teste navegação, sprites, catálogo, importação e retorno de leitura no navegador. Os dados administrativos continuam locais; a sincronização com Google Drive não foi implementada.

## Preservação

Não apague nem substitua o arquivo original `Biblioteca_Ludica_II_CHECKPOINT_V066_AVATAR_SUBSTITUIDO_2026-10-15.zip`.
A publicação web não é um backup das alterações do administrador, e não contém necessariamente todos os dados do catálogo.
Não inclua EPUBs privados ou protegidos por direitos autorais em repositório público.

Hash SHA-256 de `index.html`: `ebd87b7dc30d3b3f40f41a61a1794b3b3e2aa698218111402fcbb87ac2ac0d2d`.

## Limitações conhecidas

- O arquivo HTML contém referências textuais antigas de versão `v0.5.8` em partes da interface, herdadas do checkpoint, mas não deve ser confundido com a versão de desenvolvimento v0.5.16.
- O livro de demonstração citado em certos metadados antigos não está incluído neste pacote.
- Testes completos de compatibilidade no GitHub Pages ainda não foram realizados.
