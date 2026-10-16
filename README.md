# Biblioteca Lúdica II — v0.5.19.3 ADM-004 (experimental)

**Esta ramificação não é a publicação GitHub Pages.** A versão pública na `main` continua na v0.5.19.2.

## Objetivo

Corrigir de forma estrutural os falsos conflitos de sincronização entre navegadores A/B sem alterar sprites, salas, estantes ou o Hub EPUB V3.

## Mudanças

- Assinatura canônica contempla somente dados administrativos: planta, móveis, catálogo, fichas e arquivos.
- Zoom, progresso de leitura, empréstimos de sessão, notas e outras preferências pessoais não participam do hash administrativo compartilhado.
- Recuperação remota restaura apenas a parte administrativa, preserva o estado pessoal local e faz checagem de integridade e rollback.
- Migração conservadora de revisões antigas, com identificação de ancestralidade e bloqueio de casos ambíguos.
- Restauração evita recarregar a página e perder autorização OAuth em memória.
- Consulta periódica compara dados leves antes de gerar snapshot completo.
- Painel administrativo exibe motivo do bloqueio, base local e revisão remota.

## Verificação automatizada

Passaram testes locais de projeção canônica, reconexão e conflito, migração legada, restauração com rollback, 120 EPUBs sintéticos e 20 ciclos de consulta.

SHA-256 do `index.html`: `767631ee155b75c6ae9a8af05028e95d74bf67b0dcb2c2148d1f79025864df52`.

Git blob SHA: `e5afb3f9579f0715af96b2f46631aa326320e9de`.

**Ainda falta homologação real com dois navegadores conectados ao Google Drive. Não considerar o problema resolvido apenas pelos testes locais.**

Antes de qualquer migração em produção, exportar backup ZIP ADM-001. Nunca publicar credenciais, EPUBs privados ou backups no repositório público.
