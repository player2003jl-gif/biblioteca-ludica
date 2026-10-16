# Biblioteca Lúdica II — C3 / edição administrativa experimental

**Objetivo:** demonstrar salvamento de uma estante no Cloudflare D1 a partir do editor gráfico, com login Google e propagação automática para outro navegador.

## Ambiente

- Jogo experimental: https://player2003jl-gif.github.io/biblioteca-ludica/homologacao-cloudflare-c3/
- Worker C3 protegido: https://bl2-c3-admin-verificacao.chatgptset26.workers.dev/api/health
- Banco fictício: `bl2-c1-teste-d1`; linha `c1-estante`, vinculada somente à estante física `a-shelf-1`.
- A biblioteca oficial, as demais salas, livros e backups Google Drive não são modificados.
- Hub EPUB V3 permanece intacto.

## Ativação segura do administrador (somente o titular)

1. Abra a página de homologação C3 e procure o painel **C3 · Estante central no D1**.
2. Entre pelo botão **Google** com a conta que será usada para administrar a biblioteca. O Worker comprova criptograficamente a assinatura dos tokens de identidade Google (RS256/JWKS), a origem, audiência e validade.
3. Como a identidade ainda não está autorizada, aparecerá uma mensagem específica e um botão **Copiar identificador Google**. Esse identificador é o `sub` estável da conta Google; não é senha nem token de acesso.
4. Abra o GitHub em `https://github.com/player2003jl-gif/biblioteca-ludica/settings/secrets/actions` e crie **New repository secret** com nome exato `C3_ADMIN_GOOGLE_SUB`. Cole o identificador como valor. **Nunca cole credencial/token JWT na conversa**.
5. Informe ao assistente apenas `Identidade C3 cadastrada`. O assistente reimplantará a branch experimental `infra-c3-admin-google-20261016`; a automação copiará esse segredo ao Worker de forma protegida, sem imprimir seu valor.
6. Entre novamente pelo botão Google. O painel deve mostrar `Administrador autorizado pelo Worker`.

O botão de edição fica **bloqueado** caso o segredo não exista, o login expire, o usuário não corresponda ou a revisão esperada seja antiga. Não existe inscrição automática do primeiro usuário (evita apropriação indevida da conta de administrador).

## Prova A/B (após a autorização)

- Abra a página C3 em dois navegadores e mantenha os painéis visíveis.
- No navegador A, entre com a conta Google autorizada, abra o editor de ambientes, selecione **Estante Frontal**, altere o campo **Nome da estante** e clique em **Salvar nome**.
- Nessa cópia, o botão original foi interceptado para enviar **somente essa estante** ao D1 central. Nenhuma outra parte do ambiente é salva no servidor.
- Confirme mensagem de sucesso e incremento da revisão no navegador A.
- No B, sem atualizar a página, aguarde até 12 segundos: título do painel e nome da estante física deverão ser atualizados.
- Para conflito: mantenha um nome digitado no A, provoque uma nova revisão remota pelo outro navegador autorizado e tente salvar com versão antiga; o Worker retorna HTTP 409 e não substitui a alteração recente.

## Segurança e limites

- Apenas dados de demonstração no D1, nenhum livro real; não acionar funcionalidades administrativas fora da estante de teste.
- Token de login Google mantido somente na memória da aba (nunca localStorage ou GitHub).
- O identificador `sub` é definido por segredo na Cloudflare e usado exclusivamente como allowlist; alterar a conta administradora exige atualizar o segredo.
- A interface é uma prova: não oferece ainda autenticação completa de visitantes, recuperação administrativa, gerenciamento de vários livros ou persistência de todas as salas.
- Contas Google diferentes da cadastrada não podem editar mesmo que vejam os botões na tela.
- CORS não é autenticação. O Worker exige token Google assinado e compara a identidade com a allowlist no servidor.
