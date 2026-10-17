# E7 aprovado e E8 preparado para homologação

Data: 17/10/2026. Escopo: somente `homologacao-editor-d1/`.

## Registro E7

Usuário confirmou e autorizou registrar o E7 como aprovado em 17/10/2026, após captura da Recepção e verificação independente do frontend e D1 nesta conversa.

- Commit de origem: `c772a219855325e6272fd3fe950be7ef07c135d5`.
- D1 observado: r14, SHA-256 `c9f9a3bc44d072c500d2c838f29a39ac488624e33903e3a9972693ace22d3035`.
- Mesa `h-table`: (64, 480); estante `teste2026`: (544, 368).
- Blob do `index.html` público: `909e0fd49e902a5f51a6c2074d2b3330ebd3c5e1`.
- A aprovação E7 cobre a atualização informativa do frontend; não homologa alterações estruturais, catálogo ou EPUBs.

## Alteração E8

O sincronizador anterior exigia ativação manual em cada documento e mantinha edições não publicadas apenas em memória. Esta alteração:

1. Carrega o D1 automaticamente em uma sessão sem pendências e valida o SHA-256 recebido.
2. Mantém uma cópia da revisão confirmada e registros separados de rascunho, com revisão-base e layout-base.
3. Usa uma chave exclusiva por documento, evitando que duas abas sobrescrevam o mesmo rascunho.
4. Interrompe a aplicação automática diante de legado divergente, rascunhos, cache inválido ou edições locais.
5. Permite recuperar um rascunho sem publicar. Se a revisão-base divergir do D1, exige conciliação.
6. Exporta o layout atual em formato compatível com o editor e acrescenta `_d1Recovery`, incluindo todos os registros locais, até os ilegíveis e arquivados. Arquivar não exclui o conteúdo.
7. Preserva edições durante indisponibilidade da API e retoma consultas após reconexão. Não envia rascunhos automaticamente.
8. Registra uma publicação como incerta antes do PUT; se a resposta se perder, consulta o D1 e compara o hash antes de permitir nova tentativa. Nunca reenvia automaticamente.
9. Preserva alterações feitas enquanto um PUT está em andamento; apenas o snapshot enviado vira base confirmada.
10. Mantém autenticação no Worker e controle otimista por revisão. Tokens Google não entram no cache, rascunhos ou exportação.

Cache: `BL2_D1_E8_CONFIRMED_V1`. Rascunhos: `BL2_D1_E8_DRAFT_V1_<UUID>`. A chave `BL2_STAGING_D1_EDITOR_LAYOUT_20261016` continua como espelho do estado confirmado/escolhido na homologação. Chaves da biblioteca pública não são modificadas.

O vínculo obrigatório à existência da estante de teste foi retirado da checagem superficial do bridge. A validação efetiva de geometria continua no editor. Isso não constitui homologação das operações E10.

## Testes técnicos

Comando: `node --test homologacao-editor-d1/tests/e8-recovery.test.cjs`.

30 testes passaram com DOM, editor, armazenamento e API simulados; o código executado é o próprio bridge. Os testes usam SHA-256 real, sem chamadas ao Worker. Cobrem inicialização, cache offline, legado divergente, múltiplas sessões, recuperação, corrupção, downgrade, hash incompatível, adiamento durante gesto, reconexão, autenticação, 401/409, falha de armazenamento, gravação incerta e alteração durante PUT. Teste adicional de integração executou o carregador contra o HTML público real, verificando anchors únicos e compilação dos sete scripts inline resultantes.

Esses testes não equivalem à aprovação humana completa do E8. O `index.html` público permaneceu com o blob de referência. Nenhum PUT real foi necessário para esta implementação ou sua validação técnica.

## Teste humano proposto — E8

A. Abrir a homologação em uma sessão nova sem rascunhos: conferir a indicação E8, carregamento automático da revisão D1 atual e posições preservadas. Reabrir sem editar: deve carregar novamente sem ativação manual.

B. Fazer uma pequena edição de teste sem salvar no D1. Aguardar a indicação de rascunho, baixar a segurança local e recarregar a página. A interface deve informar a pendência e permitir recuperar o rascunho. A recuperação deve trazer a edição sem mudar a revisão central. Não publicar esse teste; para voltar ao D1, exportar backup atualizado, escolher usar o D1 e arquivar eventual rascunho antigo apenas após backup.

C. Com a página carregada, interromper temporariamente a conexão, editar sem salvar, aguardar o rascunho e reconectar. O estado deve permanecer; sem mudança remota, fica disponível para publicação explícita. Com revisão remota diferente, deve haver conflito sem sobrescrita. A falha simultânea entre dois navegadores exige um teste humano coordenado separado.

## Limites e pendências

- E8 ainda aguarda homologação humana; E9–E12 continuam pendentes.
- O cache descrito é do layout. O carregador ainda precisa obter o HTML da biblioteca; não foi criado um aplicativo que abra integralmente sem internet.
- Rascunhos ficam no navegador e dependem do armazenamento disponível. Fechamento abrupto antes do checkpoint (intervalo de 750 ms, complementado por eventos) pode perder a última fração de uma interação. Exportação JSON continua necessária como backup independente.
- Dados de uma janela anônima são apagados pelo navegador ao encerrar todas as janelas anônimas. Para testar recuperação, recarregar a mesma aba ou usar uma janela normal; não encerrar a sessão anônima com rascunho único.
- Conflitos entre revisões diferentes continuam exigindo conciliação verificável; não foi implementada fusão automática de objetos.
- A página E5 é um instrumento histórico específico da conciliação r13 → r14, não um resolvedor genérico de novos conflitos.
- Não houve alteração de Worker, D1, gráficos, Hub EPUB V3, catálogo, EPUBs ou configuração de produção.

## Reversão

Restaurar apenas `homologacao-editor-d1/index.html` e `homologacao-editor-d1/d1-editor-bridge.js` do commit de origem acima. Exportar previamente a segurança local E8: o bridge anterior não sabe recuperar os novos registros de rascunho. Não apagar as chaves E8 nem restaurar r14 sobre revisão posterior. Nenhuma migração de banco foi realizada.
