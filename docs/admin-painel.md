# Painel administrativo

Plano pedido em 27–29 set 2026. As Fases A (fundação) e B (visão geral) estão
em andamento. As decisões do dono estão no fim deste documento.

## Arquitetura

- **Acesso:**
  - `profiles.papel = 'admin'` continua sendo quem entra no painel;
  - a tabela `admin_funcoes` define o que cada admin vê: `geral`,
    `financeiro`, `suporte`, `pedagogico`, `moderador`, `analista`;
  - o mapa área → funções fica em `src/lib/admin/permissoes.ts`
    (`AREAS_ADMIN`).
- **Barreiras:**
  - toda página, rota e ação do painel chama `requireArea("<área>")`
    (`src/lib/admin/sessao.ts`). Um teste garante isso em
    `test/admin.test.mjs`;
  - o banco confere de novo: `app.tem_funcao()`, RLS e funções liberadas só
    para o service role.
- **Auditoria:**
  - `admin_auditoria` (só acréscimo) registra quem, ação, entidade, antes e
    depois, motivo, resultado e IP;
  - `limparParaAuditoria` remove senha, token, chave, CPF e cartão antes de
    gravar;
  - tentativas negadas também entram (`acesso.negado`);
  - a tela fica em `/admin/logs`, com filtros e exportação CSV.
- **Métricas:** `public.admin_metricas()` e `public.admin_serie_diaria()`
  (migration 0022):
  - agregam no banco, então não sofrem o limite de 1.000 linhas da API;
  - só o service role executa;
  - dias contados no horário de Brasília;
  - o período anterior (mesmo tamanho) serve para comparar.
- **Dinheiro:**
  - valores em centavos inteiros (`src/lib/admin/indicadores.ts`);
  - custo de IA em micro-dólares com `BigInt` (`src/lib/ai/precos.ts`), sem
    erro de ponto flutuante.

## Natureza de cada número

| Tipo | Significa | Exemplos |
|---|---|---|
| Confirmado | veio do provedor ou do banco sem cálculo | receita (webhook do Asaas), alunos, sessões |
| Estimado | preço × consumo, ou conversão de moeda | custo de IA (tabela `precos_ia`), custo em reais (PTAX), resultado, margem |
| Parcial | falta parte do dado | receita líquida enquanto algum pagamento não tem `valor_liquido` |
| Calculado | fórmula sobre dados confirmados | taxa de ativação, conversão, ticket médio, receita recorrente |

- **Câmbio:** PTAX de venda do Banco Central (API Olinda, pública). A última
  cotação fica salva em `billing_config` como reserva. Sem cotação, o painel
  mostra só dólar; nunca inventa taxa.
- **Preços de IA:** tabela `precos_ia`, com histórico por data de vigência.
  - Haiku 4.5: tabela pública da Anthropic.
  - ElevenLabs: **estimativa**. Confirme no plano contratado e ajuste.

## Dados registrados a partir de 29/09/2026

| Dado | Onde |
|---|---|
| Conversas e mensagens das aulas | `conversas`, `mensagens`. O texto fica 90 dias e é apagado pelo pg_cron (`apagar-textos-conversas`, 03:17 UTC), mantendo data, tokens, custo e status. Não há policy de acesso: só o servidor lê, e a leitura pelo painel vai para a auditoria. |
| Falhas de IA | `ai_usage_events.status = 'erro'` (texto, voz, transcrição, assistente) |
| Tutor, conversa, mensagem e tempo de resposta | colunas novas em `ai_usage_events` |
| Custo do assistente de vendas | `ai_usage_events.origem = 'assistente_vendas'`, sem aluno e sem texto |
| Receita líquida | `payments.valor_liquido` (netValue do Asaas, no webhook) |
| Status do tutor | `tutores.status`: rascunho, teste, ativo, pausado ou arquivado |
| Suspensão | `profiles.suspenso_em` e `suspenso_motivo` (tela na Fase B, área Alunos) |

## Correções de segurança feitas na Fase A

- O aluno conseguia **inserir consumo de IA falso** direto pela API do banco,
  por causa de uma policy de insert. A policy foi removida e só o servidor
  grava.
- A página "Assinaturas" lia uma **tabela legada** (`assinaturas`) com dados
  antigos. Agora lê `subscriptions`, com paginação e sem N+1.
- O dashboard antigo (`AdminDashboard`, `ListaAlunos`, `GerenciadorPlanos`,
  `stats.ts`, `dashboard/actions.ts`) **nunca funcionou**:
  - conferia a coluna inexistente `is_super_admin`, então sempre negava
    acesso;
  - consultava colunas que não existem (`full_name`, `email` em profiles,
    `horas`);
  - lia pagamentos sem permissão.

  Foi removido e continua no histórico do Git. A edição de preço de plano
  (que alterava preço sem auditoria) volta na área Configurações, com
  confirmação e auditoria.

## O que não existe no app (não é mostrado nem inventado)

- Cursos, módulos, quizzes, exercícios, taxa de acerto e notas por
  habilidade: as aulas são conversa livre.
- Avaliação das aulas, chamados de suporte e sinalizações automáticas: Fase D.
- Custos fixos e de fornecedores: Fase C (cadastro manual, estimado ×
  confirmado).
- País ou região e idioma nativo: não são coletados.
- Teste grátis: o plano `teste_7dias` existe, mas está fora da vitrine.
- Geração de imagens, embeddings, SMS, e-mail e tradução: o app não usa.
- Horas extras: a data usada é a da compra (`criada_em`), porque não há data
  de confirmação.

## Fases

| Fase | Conteúdo | Situação |
|---|---|---|
| A | Funções, auditoria, layout, preços de IA, instrumentação (falhas, tutor, latência, conversas), valor líquido, correções | Feita |
| B | Visão geral (feita), Alunos, Tutores | Em andamento |
| C | Custos e ferramentas, Assinaturas e receitas, Financeiro (demonstrativo mensal, margens, ponto de equilíbrio), alertas de orçamento | A fazer |
| D | Conversas (central e visualização auditada), sinalizações, moderação, suporte, avaliação da aula | A fazer |
| E | Versões do prompt no banco + playground, Aprendizagem, Configurações | A fazer |

## Decisões do dono (29 set 2026)

- Guardar o texto das conversas por 90 dias. A política de privacidade foi
  atualizada antes de começar.
- Começar pelas Fases A e B.
- Estrutura de funções criada agora. Hoje só há administradores gerais.

## Testes

- `test/admin.test.mjs`:
  - custo por token e ferramenta;
  - períodos e fuso;
  - permissões;
  - indicadores;
  - CSV;
  - auditoria sem dados sensíveis;
  - toda página do painel protegida.
- `test/integracao.admin.test.mjs`:
  - conversas, consumo e falhas no banco real;
  - métricas;
  - aluno sem acesso direto a consumo, conversas, auditoria e métricas.
- Retenção de 90 dias: conferida no banco (o texto é apagado e o registro
  fica).
