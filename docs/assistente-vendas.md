# Assistente de dúvidas (página de vendas → checkout)

Chat com IA que tira dúvidas de quem ainda não é aluno. Ele aparece nestas
páginas: página inicial, cadastro, checkout, `/contato` e `/reembolso`. A
conversa continua de uma página para a outra, porque fica guardada no
`sessionStorage` do navegador.

## Como funciona

- **Botão "Dúvidas?"** no canto inferior direito. No celular, só o ícone,
  acima do botão fixo de compra.
- **Convite proativo:** depois de 20 segundos na página, aparece "Ficou com
  alguma dúvida? Estou aqui pra tirar 😊" (uma vez por sessão).
- **Sugestões prontas:**
  - como funciona a aula;
  - qual plano escolher;
  - se iniciante consegue acompanhar;
  - reembolso.
- **O assistente também pergunta.** Quando faz sentido, termina a resposta com
  uma pergunta curta (idioma, objetivo, tempo por semana) e sugere o plano
  adequado, sem pressão.

## De onde vem o conhecimento (nada inventado)

`src/lib/vendas/assistente.ts` monta as instruções a cada pergunta, a partir de:

| Fonte | Conteúdo |
|---|---|
| tabela `planos` | preço, 1º mês com desconto, horas e voz de cada plano (planos de teste ficam de fora) |
| `src/lib/vendas/produto.ts` | professores, passo a passo, benefícios e comparação — os mesmos da página |
| `src/lib/types.ts` | idiomas e sotaques |
| perguntas frequentes | textos editáveis em `/admin/pagina-de-vendas` |
| regras de reembolso | `src/lib/billing/regras-reembolso.ts` |
| contato | canais preenchidos no admin (se estiverem vazios, ele não inventa) |

- Se alguém muda um preço no banco ou uma pergunta no admin, a resposta muda
  junto.
- O que não está nas fontes, o assistente diz que não sabe e indica
  `/contato`. Alguns exemplos: se as horas não usadas acumulam, planos para
  empresas, nota fiscal.

## Segurança e custo

- **Rota:** `POST /api/assistente`, pública.
- **Limites:**
  - 20 perguntas a cada 10 minutos por IP;
  - teto diário do app de 800 perguntas (`ASSISTENTE_LIMITE_DIARIO`);
  - no máximo 600 caracteres por mensagem e as 16 últimas mensagens;
  - resposta de no máximo 450 tokens.
- Não tem ferramentas: só conversa. Não acessa contas nem pagamentos.
- **Nada da conversa é gravado no servidor.** O funil registra só os eventos
  `assistente_aberto` e `assistente_pergunta`, sem o texto (migration 0019).
  O log guarda só a contagem de tokens.
- O próprio chat avisa: "Não envie CPF, cartão ou senha. A IA pode errar".
- **Liga e desliga** em `/admin/pagina-de-vendas` → "Assistente de dúvidas".
- **Sem crédito na Anthropic**, ou com o teto diário atingido, o chat
  responde que não conseguiu e aponta as perguntas frequentes e o contato.
- **Custo estimado (Haiku 4.5):** cerca de 4 mil tokens de entrada e 200 de
  saída por pergunta, ou seja, US$ 0,005. O teto de 800 por dia dá no máximo
  cerca de US$ 4 por dia.

## Páginas relacionadas

- **`/reembolso`:** política pública de cancelamento e reembolso, com a base
  legal (CDC arts. 20, 35, 42 e 49; Decreto 7.962/2013 art. 5º). Revisão
  jurídica pendente.
- **`/contato`:** canais de atendimento, horário e dados da empresa (nome,
  CNPJ, endereço — exigidos pelo Decreto 7.962/2013, art. 2º).
  - Tudo é preenchido em `/admin/pagina-de-vendas` → "Contato".
  - Campo vazio aparece como "em breve".

## Testes

`test/assistente.test.mjs` cobre:
- o conhecimento vem dos dados reais;
- o plano de teste fica de fora;
- preço novo muda a resposta;
- contato não é inventado;
- as regras de conduta estão nas instruções;
- a validação da conversa (papéis, tamanho, quantidade);
- limites e liga/desliga na rota;
- acessibilidade do chat;
- a base legal na página `/reembolso`;
- "em breve" no `/contato`.
