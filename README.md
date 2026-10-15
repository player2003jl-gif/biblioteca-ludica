# Biblioteca Lúdica II — v0.5.19 (ADM-003)

Aplicação experimental de exploração RPG 2,5D com sincronização administrativa no Google Drive. Hospedagem estática pelo GitHub Pages.

**Endereço do site:** https://player2003jl-gif.github.io/biblioteca-ludica/

## Histórico e integridade

- Base de continuidade: checkpoint original v0.5.16, seguido das implementações ADM-001 (v0.5.17), ADM-002 (v0.5.18) e ADM-003 (v0.5.19).
- O `index.html` é uma distribuição web independente, com os recursos incorporados.
- SHA-256 do `index.html`: `76cb82bb90831664a94f700b7c0df3f514e42bdc3bc6e79dbd3aa38e98f16647`.
- Backup Git da v0.5.18: ramificação `backup-main-v0518-antes-v0519`.
- A ramificação `teste-v0519-adm003` guarda o histórico da construção experimental.

## Persistência administrativa

A versão ADM-003 inclui recuperação automática do último estado no Google Drive **após autorização OAuth**, sincronização de alterações administrativas salvas, consulta periódica de revisões remotas, preservação das alterações locais em caso de desconexão e detecção conservadora de conflitos.

A aplicação não publica os dados administrativos armazenados na pasta privada `appDataFolder` do Google Drive. Backups integrais devem continuar sendo exportados e guardados separadamente.

**Não há autenticação administrativa própria no GitHub Pages.** O site e a interface de edição local são públicos; a autorização do Google protege apenas o acesso aos dados privados de cada conta Drive.

## Homologação

A v0.5.19 passou por verificações automatizadas e testes simulados, mas o comportamento de autenticação e sincronização Google Drive entre computadores reais ainda precisa ser confirmado pelo administrador. Até lá, considerá-la **experimental**.

Não publique livros protegidos por direitos autorais, backups privados, tokens ou segredos no repositório público.
