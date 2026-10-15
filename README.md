# Biblioteca Lúdica II — v0.5.19.2 ADM-003.1 (ramificação de teste)

**Esta ramificação é experimental; o site GitHub Pages público permanece na v0.5.19.1.**

## Correção de sincronização
- Quando o Drive tem uma revisão nova e o navegador conserva integralmente o estado da última revisão conhecida (assinatura conferida), a ADM-003.1 recebe a nova revisão automaticamente.
- O simples fato de o editor estar aberto não produz conflito: o recebimento aguarda a saída do modo de edição.
- Flags de conflito indevido da v0.5.19.1 não bloqueiam recuperação se a assinatura do estado confirmar que nenhuma mudança real foi feita.
- Se o estado local mudou, a proteção contra sobrescrita e a confirmação manual permanecem.
- Um novo controle imediatamente antes da gravação impede que uma edição iniciada durante a transferência seja descartada.

## Integridade
- SHA-256 do `index.html`: `182940778aa82e84cab2e188ca8008846ae81d93ace4f6adc9aae2b45098a285`.
- Git blob: `32f9d6b6f8054bec0a78577ad6340110fa82440b`.
- Base pública v0.5.19.1: commit `5607e52c91742a53b9bd1000f7a675c509fd318c`.
- O HTML desta branch foi reconstruído com patch compactado e conferência criptográfica pelo GitHub Actions.
- Os recursos gráficos e o Hub EPUB V3 permanecem byte a byte idênticos à versão anterior.

## Homologação
Testes simulados passaram para reconexão entre navegadores, atualização periódica, editor aberto, falsa pendência legada, conflito real, modo offline, deduplicação EPUB e recuperação ADM-001. **A integração OAuth/Drive com dois navegadores reais ainda não foi homologada.**

Antes do teste real, exporte um ZIP ADM-001. Não use “Manter estado local” para resolver automaticamente conflitos desconhecidos. Nunca publique EPUBs privados, backup ZIP ou tokens no GitHub.
