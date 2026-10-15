# Biblioteca Lúdica II — v0.5.19.1 ADM-003 (correção)

Versão pública de manutenção da v0.5.19, com correções de compatibilidade do layout e estabilidade das assinaturas de sincronização. **Experimental:** a sincronização Google Drive entre navegadores reais continua pendente de homologação.

Aplicação: https://player2003jl-gif.github.io/biblioteca-ludica/

## Correções
- O bibliotecário da Biblioteca permanece na posição original. A validação agora admite exclusivamente a pequena sobreposição herdada com a estante lateral, sem permitir novas colisões.
- As chaves técnicas BL2_ADM002_* e BL2_ADM003_* deixam de integrar o conteúdo e a assinatura dos backups administrativos, evitando falsos conflitos de sincronização.
- Na restauração de revisões antigas, a assinatura canônica é recalculada sem alterar os livros, sprites ou posições do layout.

## Integridade e segurança
- SHA-256 do index.html: `7733541b79fddf1463787f0623a303c47b8f3fafdc7ccbe49b2750ec74e1ca91`.
- Git blob SHA: `ce954ef43da167d499db12e7a8d38e4119cb9086`.
- Backup da versão v0.5.19 original: `backup-main-v0519-antes-hotfix`.
- Backup da v0.5.18: `backup-main-v0518-antes-v0519`.
- Histórico de correção: `fix-v0519-1-adm003`.

O código foi verificado com testes de contrato simulados, validação específica da geometria herdada e comparação binária reversível que confirma a preservação integral do HTML fora dos três módulos corrigidos.

**Importante:** mantenha cópias ZIP ADM-001 independentes; o GitHub Pages é público e não fornece autenticação de Administração. Nenhuma credencial nem EPUB pessoal devem ser enviados ao repositório.
