# Biblioteca Lúdica II — v0.5.19.2 ADM-003.1 (experimental)

**Biblioteca pública:** https://player2003jl-gif.github.io/biblioteca-ludica/

A v0.5.19.2 corrige a recepção automática de revisões administrativas do Google Drive entre navegadores, sem alterar a experiência gráfica nem o Hub EPUB V3.

## Correções
- Revisões remotas recentes são recebidas automaticamente quando a assinatura local coincide com a última revisão conhecida e não há edições locais pendentes.
- O modo de edição aberto adia a aplicação da revisão remota até que seja seguro, sem produzir falso conflito.
- Pendências de conflito indevidas de versões anteriores não impedem o recebimento quando as assinaturas provam ausência de mudanças locais.
- Revisões concorrentes ou mudanças locais continuam exigindo decisão expressa do administrador.
- Nova verificação antes da restauração impede sobrescrever modificações iniciadas durante um download.

## Integridade e continuidade
- SHA-256 do `index.html`: `182940778aa82e84cab2e188ca8008846ae81d93ace4f6adc9aae2b45098a285`
- Git blob SHA do `index.html`: `32f9d6b6f8054bec0a78577ad6340110fa82440b`
- Commit anterior público: `5607e52c91742a53b9bd1000f7a675c509fd318c`
- Backup anterior: `backup-main-v0519-1-antes-adm0031`
- A implementação foi testada com navegadores simulados; o teste com Google Drive real deve ser repetido para homologação.

## Segurança
O GitHub Pages é público e não fornece autenticação própria à interface administrativa. A conta Google conectada protege o armazenamento privado do Drive; os dados dessa conta não se tornam públicos. Não publicar livros privados, tokens, segredos ou backups no repositório público.

Continue exportando backups ZIP ADM-001 independentes. A publicação para visitantes e o controle de autorização de alterações oficiais continuam sendo objetivos do plano de conclusão do hub.
