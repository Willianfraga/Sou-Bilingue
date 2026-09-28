# Página de vendas

Endereço: `/` (soubilingue.com.br e app.soubilingue.com.br). Quem está
logado é levado direto para a própria área. Redesenho de 27 set 2026, com
direção visual inspirada numa referência de portfólio 3D (nada copiado:
personagens, textos e marcas são do Sou Bilíngue).

## Estrutura

| # | Seção | Onde |
|---|---|---|
| 1 | Topo escuro: selo, título, subtítulo, 2 botões, informações reais de baixo risco, Clara (professora virtual) com balões flutuantes | `src/app/page.tsx` |
| 2 | Barra de confiança (só fatos: 5 idiomas, 6 professores, voz, certificado, correção) | idem |
| 3 | "Parece com você?" — objeções respondidas | idem |
| 4 | Solução + galeria dos 6 professores | idem |
| 5 | Como funciona (6 passos clicáveis) | `src/components/vendas/ComoFunciona.tsx` |
| 6 | Benefícios | `page.tsx` |
| 7 | Personalização + demonstração de conversa (animação de digitação, marcada como ilustrativa) | `DemoConversa.tsx` |
| 8 | Comparação com curso em turma e app de exercícios (inclui onde os outros ganham) | `page.tsx` |
| 9 | Depoimentos — **só aparece se houver depoimentos cadastrados** | `page.tsx` |
| 10 | Evolução (como o progresso é acompanhado, sem promessa de resultado) | `page.tsx` |
| 11 | Planos (da tabela `planos`), botão por plano, regras de cobrança | `page.tsx` |
| 12 | Sem surpresas (pagamento, desconto, dados, controle) | `page.tsx` |
| 13 | Perguntas frequentes (editáveis) | `page.tsx` |
| 14 | CTA final + rodapé (termos, privacidade, suporte) | `page.tsx` |
| — | Botão fixo discreto no celular | `CtaFixoMobile.tsx` |

## De onde vem cada conteúdo

- **Preços, horas, desconto e voz por plano:** tabela `planos` +
  `src/lib/billing/planos.ts`. Nunca escrever preço no código da página.
- **Textos editáveis** (título, subtítulo, botões, aviso, perguntas,
  depoimentos, suporte, SEO): tabela `pagina_vendas`, editada em
  **/admin/pagina-de-vendas**. Padrões em `src/lib/vendas/conteudo.ts`.
- **Textos fixos** (objeções, benefícios, comparação, passos): no código, por
  descreverem o funcionamento real do produto.

## Regras de honestidade

- Nada de "grátis", garantia, números, avaliações ou depoimentos que não
  existam. Os testes (`test/vendas.test.mjs`) bloqueiam os textos que a
  página antiga tinha ("7 dias grátis", "Sem cartão", "Cancele quando quiser",
  "Método comprovado").
- Depoimentos só com autorização do aluno.
- Sem urgência ou escassez falsa na faixa de aviso.

## Como editar

1. Entre como administrador → menu **Página de vendas**.
2. Perguntas: um bloco por pergunta (1ª linha = pergunta, resto = resposta,
   linha em branco entre blocos).
3. Depoimentos: 1ª linha `Nome | contexto`, resto = texto.
4. **Salvar e publicar** — vale na hora. **Restaurar textos padrão** desfaz.

Planos e preços: tabela `planos` (migration nova ou SQL Editor). O plano em
destaque é `PLANO_RECOMENDADO` e o público de cada plano é `publicoDoPlano`,
ambos em `src/lib/billing/planos.ts`.

## Pagamento e campanhas

O pagamento é pelo **Asaas** (decisão de 27 set 2026; a Kiwify do pedido
original não foi adotada). Fluxo curto: botão → `/cadastro` (conta) →
`/checkout` (plano escolhido já marcado) → página do Asaas → webhook confirma
→ entrevista de boas-vindas → aula. Detalhes em `docs/plans-and-credits.md`.

**Vídeo de aula real:** campo "Vídeo de uma aula real" no admin (YouTube ou
Vimeo). O player só carrega no clique (YouTube em modo sem cookies). Vazio =
demonstração animada.

**Depoimentos:** os alunos enviam em Meu perfil → "Conte como está sendo",
marcando a autorização (só maiores de idade). Aparecem na página depois de
aprovados em **/admin/depoimentos**; o aluno pode retirar a autorização a
qualquer momento, e a retirada não pode ser revertida pelo admin.

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`,
  `src` e `sck` da URL são guardados na sessão do navegador e anexados aos
  botões (`data-campanha`).
- **Cupom de desconto na URL: retirado** (decisão de 27 set 2026). `?coupon=`
  é ignorado. Os cupons por escola antigos continuam só em `/admin/cupons`.
- Links de campanha: `https://soubilingue.com.br/?utm_source=instagram&utm_campaign=lancamento&src=qr_escola`

## Métricas (sem dados pessoais)

Tabela `eventos_funil`, gravada por `/api/eventos` (limite por IP) e pelo
webhook. Sessão = id aleatório no `sessionStorage`; sem cookies de terceiros.

| Evento | Quando |
|---|---|
| `pagina_vista` | abriu a página |
| `cta_principal` | clicou num botão de começar |
| `como_funciona` | clicou em "como funciona" |
| `planos_vistos` | a seção de planos apareceu na tela |
| `plano_selecionado` | clicou no botão de um plano |
| `ida_ao_checkout` | foi para a página de pagamento |
| `compra_confirmada` | **só o webhook grava**, na ativação da assinatura |

Resumo dos últimos 30 dias no topo de /admin/pagina-de-vendas.

**Testes A/B (futuro):** campo `variante` no conteúdo, textos editáveis e
`PLANO_RECOMENDADO` centralizado. Não há ferramenta de A/B instalada.

## Acessibilidade e desempenho

- HTML semântico (header/main/section/footer, tabela com caption, FAQ com
  `<details>`), abas do "como funciona" com setas do teclado, foco visível.
- Animações só com CSS e `IntersectionObserver`; desligadas com
  `prefers-reduced-motion`. Sem JS, tudo fica visível.
- Sem bibliotecas novas. Imagem do topo com `priority`; as demais com lazy
  loading e tamanhos responsivos (`next/image`).
- Revisão automatizada (27 set): sem erros de console, sem rolagem lateral em
  390 px, ordem de foco correta, parâmetros de campanha preservados.

## Pendências

- Contato de suporte (e-mail/WhatsApp) — preencher no admin; sem ele, o
  rodapé não mostra suporte e a resposta de cancelamento fica sem canal.
- Cancelamento pelo próprio aluno (hoje só via suporte).
- Revisão jurídica de `/termos` e `/privacidade` (versões preliminares).
- Depoimentos reais (com autorização).
