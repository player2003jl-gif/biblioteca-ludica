# C1 — Primeira configuração na Cloudflare

O código experimental já foi preparado, **mas ainda não foi implantado na sua conta Cloudflare**. Antes de qualquer integração com a Biblioteca pública, confirme as seguintes condições:

- Sua conta Cloudflare permite criar um Worker e um banco D1 no plano gratuito.
- Para ativar R2, leia atentamente a exigência eventual de método de pagamento e a política de cotas. Não aceite um serviço pago sem querer.
- Não envie credenciais Cloudflare, senhas, tokens ou números de cartão ao ChatGPT.
- Reserve nomes exclusivos para os testes: `bl2-c1-homologacao`, `bl2-c1-teste-d1` e `bl2-c1-teste-r2`.

**A primeira ação recomendada é abrir https://dash.cloudflare.com/ e verificar se os menus Workers & Pages, D1 e R2 estão disponíveis.** Não exclua nem modifique recursos de tentativas anteriores. Envie apenas uma captura da área de serviços (sem dados sensíveis), ou relate o que aparece. Assim escolheremos o menor caminho de ativação, respeitando seu orçamento de hobby.

O repositório GitHub mantém o front-end público inalterado. Esta fase é de infraestrutura; o uso de livros reais será posterior.
