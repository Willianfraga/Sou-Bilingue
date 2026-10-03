# Sou Bilíngue — estado atual do projeto

> **Comece por aqui.** Este é o documento principal e está atualizado até
> **29/09/2026** (commit 41fb198 em produção). Os arquivos antigos da raiz
> (`RESUMO_EXECUTIVO.md`, `PROGRESSO_TOTAL.md`, `O_QUE_FALTA.md`,
> `CORREÇÕES_REALIZADAS.md` etc.) são histórico de agosto e podem estar
> desatualizados. Em caso de conflito, vale este documento.

## 1. O que é

Aplicativo brasileiro de prática de idiomas por **conversa com professores
virtuais de IA**:
- **Idiomas:** inglês, espanhol, francês, italiano e mandarim.
- **Tutores:** 6.
- **Voz:** conversa por voz, com transcrição automática.
- **Assinatura:** mensal, cobrada pelo Asaas.

| Item | Onde |
|---|---|
| Site em produção | https://app.soubilingue.com.br (também soubilingue.com.br e www) |
| Código | GitHub `Willianfraga/Sou-Bilingue` — **repositório PÚBLICO**, branch `codex/sou-bilingue-deploy` |
| Pasta local | `C:\Users\Willian fraga\OneDrive\Sou Bilingue\soubilingue` |
| Hospedagem | Coolify (VPS). Deploy pela API do Coolify a partir do GitHub |
| Banco e login | Supabase, projeto `skalodmhvgvjuieesimj` ("Sou Bilingue 1.0"), região São Paulo |
| Pagamentos | Asaas — **ainda em SANDBOX** (nenhuma cobrança real) |
| IA | Anthropic Claude Haiku 4.5 (tutor e assistente), ElevenLabs (voz premium e transcrição) |

## 2. O que já funciona

### Para quem ainda não é aluno

- **Página de vendas** (`/`):
  - preços vindos do banco e 1º mês com 50% de desconto;
  - demonstração de conversa, espaço para vídeo e depoimentos reais
    autorizados;
  - FAQ editável no admin;
  - métricas de funil sem dados pessoais.
- **Assistente de dúvidas com IA:**
  - aparece da página de vendas até o checkout, em `/contato` e em
    `/reembolso`;
  - responde só com dados reais do app, convida a conversar e faz perguntas
    ao visitante;
  - limite por IP e teto diário; nada da conversa é gravado;
  - liga e desliga no admin.
  - Detalhes: `docs/assistente-vendas.md`.
- **Caminho curto:** cadastro (`/cadastro`) → pagamento (`/checkout`,
  página segura do Asaas) → entrevista → aula.
- **Páginas legais:**
  - `/termos`;
  - `/privacidade` (inclui a retenção de 90 dias das conversas);
  - `/reembolso` (política com base no CDC e no Decreto 7.962/2013);
  - `/contato`: canais e dados da empresa. Mostra "em breve" até o dono
    preencher no admin.

### Para o aluno

- **Entrevista de boas-vindas:** 15 perguntas, uma por vez, obrigatória antes
  da primeira aula. Aparece uma vez só; dá para editar ou refazer em
  **Perfil**. As respostas personalizam todas as aulas (`buildStudentContext`).
- **Aula por voz** com o tutor escolhido:
  - prompt do professor v2 (`docs/PROMPT_PROFESSOR.md`);
  - memória de fatos do aluno;
  - voz premium, ou voz do navegador no plano Essencial.
- **Tela inicial do aluno:** tutor + botão "Iniciar minha aula" + menu bento (grade de atalhos), personalizada pela entrevista.
- **Área do aluno:** progresso (`/aluno/progresso`), lições, certificados mensais verificáveis
  (`/verificar/[código]`) e horas extras compráveis.
- **Minha assinatura** (`/assinatura`):
  - **cancelar a renovação** a qualquer momento;
  - **pedir reembolso**: integral em até 7 dias, com senha e protocolo;
    depois disso, vai para análise.
  - Detalhes: `docs/refund-policy.md`.
- **Área do responsável** (aluno menor): acompanhamento, certificados e
  consentimento.

### Painel administrativo (`/admin`)

Detalhes em `docs/admin-painel.md`.

- **Funções:** geral, financeiro, suporte, pedagógico, moderador e analista.
  Hoje as duas contas admin são "geral": `admin@soubilingue.com.br` e
  `wfgempreendimentos.adm@gmail.com`.
- **Checagem de acesso:** toda página e ação confere a função no servidor e
  no banco. Toda ação fica em **Logs e auditoria**.
- **Áreas prontas:**

  | Área | O que tem |
  |---|---|
  | Visão geral | Indicadores reais com comparação ao período anterior; cada número marcado como confirmado, estimado, parcial ou calculado |
  | Alunos | Busca, alertas, ficha completa; suspender, reativar, exportar dados (LGPD) e anonimizar |
  | Tutores de IA | Status e métricas por tutor |
  | Assinaturas e receitas | Planos, status, inadimplência, receita recorrente, ticket, cancelamento, LTV, motivos |
  | Reembolsos | Análise dos pedidos |
  | Custos de IA | Por serviço, modelo, tutor e origem |
  | Custos e ferramentas | Fornecedores, faturas, alertas |
  | Financeiro | Demonstrativo mensal, orçamento, ponto de equilíbrio, margens, CSV |
  | Outras | Página de vendas, Depoimentos, Cupons, Certificação, Conteúdo, Consentimentos LGPD, Origem dos cadastros, Escolas, Logs e auditoria |

- **Em breve:** Conversas, Aprendizagem, Suporte, Segurança e moderação,
  Configurações.

## 3. Como o sistema está montado

- **Next.js 15.5 (App Router) + TypeScript + Tailwind:**
  - páginas e ações no servidor;
  - segredos só no servidor (nunca no navegador).
- **Supabase:**
  - RLS em todas as tabelas: cada aluno vê só os próprios dados;
  - operações sensíveis via service role, sempre depois de conferir quem é o
    usuário.
- **Pagamento:**
  - o 1º mês é uma cobrança avulsa com desconto;
  - o webhook do Asaas confirma o pagamento e cria a assinatura recorrente;
  - o webhook exige token, é idempotente e não guarda dados pessoais.
- **Custo de IA:**
  - cada chamada grava tokens/caracteres/segundos, tutor, conversa, tempo de
    resposta e falhas;
  - preços ficam na tabela `precos_ia`, com histórico;
  - câmbio pela PTAX do Banco Central.
- **Conversas:** texto guardado por **90 dias**, depois apagado
  automaticamente (pg_cron). Aluno não lê direto do banco.
- **Dinheiro:** calculado em centavos inteiros ou micro-dólares, sem ponto
  flutuante.

## 4. Banco de dados — migrations

Todas estão aplicadas no projeto `skalodmhvgvjuieesimj`.

| # | Conteúdo |
|---|---|
| 0001–0011 | Esquema inicial, perfis, tutores, assinaturas e pagamentos, uso de horas, horas extras, memórias, métricas de IA, elenco de 6 tutores |
| 0012 | Ilustrações anime dos tutores |
| 0013 | Entrevista de boas-vindas (`aluno_onboarding`) |
| 0014 | Preços (+R$ 9,90) e 1ª mensalidade com 50% |
| 0015 | Webhooks (`webhook_events`) e endurecimento de segurança |
| 0016 | Página de vendas editável e funil |
| 0017 | Cancelamento pelo app e depoimentos |
| 0018 | Reembolsos + correção que destravou o checkout (status `pendente`) |
| 0019 | Eventos do assistente de vendas no funil |
| 0020 | Painel: funções, auditoria, preços de IA, conversas e mensagens, colunas de consumo, valor líquido, status de tutor, suspensão; **fim da falha que deixava o aluno gravar consumo falso** |
| 0021 | Retenção de 90 dias (pg_cron) |
| 0022 | Métricas agregadas da visão geral |
| 0023 | Alunos, tutores e anonimização (LGPD) |
| 0024 | Fornecedores, lançamentos de custo, orçamentos, financeiro e alertas |

Para aplicar uma migration nova: API de gerenciamento do Supabase
(`POST /v1/projects/<ref>/database/query`), com `SUPABASE_ACCESS_TOKEN` lido do
`.env.local`, **sem imprimir o token**.

## 5. Documentação atual

| Documento | Assunto |
|---|---|
| `docs/ESTADO_ATUAL.md` | Este resumo geral |
| `docs/changelog.md` | O que mudou, por data |
| `docs/admin-painel.md` | Painel administrativo: arquitetura, regras, fases, achados |
| `docs/refund-policy.md` | Cancelamento e reembolso |
| `docs/assistente-vendas.md` | Assistente de dúvidas |
| `docs/sales-page.md` | Página de vendas |
| `docs/payment-security.md` | Pagamentos e checklist antes de vender de verdade |
| `docs/plans-and-credits.md` | Planos, horas e créditos |
| `docs/CUSTOS_IA.md` | Custos de IA e simulações |
| `docs/PROMPT_PROFESSOR.md` | Prompt do professor (referência para agentes) |
| `docs/deployment.md` | Como publicar |
| `docs/agente-manutencao.md` | Agente de manutenção e verificador de saúde (`npm run saude`) |
| `CLAUDE.md` | Regras para agentes de IA que mexem no projeto |

Os demais `.md` da raiz e os `docs/FASE*.md` são histórico de agosto.

## 6. Testes

| Comando | O que roda | Último resultado (29/09) |
|---|---|---|
| `npm test` | Unitários | 230/230 |
| `npm run test:integracao` | Banco real, com usuários descartáveis apagados no fim; roda um arquivo por vez | 37/37 |
| `TEST_BASE_URL=https://app.soubilingue.com.br npm run test:e2e` | Contra o site | 37 ok, 1 pulado |
| `npx tsc --noEmit` e `npx next lint` | Tipos e lint | Sem erros |
| `npm run saude` | Saúde do sistema em produção (só lê) | Em 29/09: 1 problema (Anthropic sem créditos) |

## 7. Cuidados para quem continuar

Para manutenção, use o agente `.claude/agents/manutencao.md`, que segue estas
regras, e comece com `npm run saude`. Guia em `docs/agente-manutencao.md`.

1. **O repositório é público.** Antes de cada commit, varrer segredos. Nunca
   colocar senha, token ou chave em arquivo (nem em documentação).
2. **Build falha com `EINVAL readlink` em `.next`:** é o OneDrive. Apague
   `.next` e rode de novo.
3. **Servidor local na porta 3100:** encerre o processo antigo antes de subir
   outro.
4. **Deploy no Coolify às vezes falha por infraestrutura** (código 255).
   Basta repetir.
5. **Listar variáveis do Coolify:** nunca formatar os valores sem filtrar pelo
   nome antes. Já houve vazamento assim.

## 8. Pendências

### Do dono (ações manuais)

1. **Recarregar créditos da Anthropic.** Sem isso a tutora e o assistente de
   vendas não respondem.
2. **Trocar as chaves expostas em setembro:**
   - Supabase secret;
   - Anthropic;
   - Asaas (chave e token do webhook);
   - ElevenLabs;
   - Tavus;
   - CRON_SECRET;
   - senha do banco.
3. **Asaas de produção:**
   - chaves reais;
   - webhook apontando para `https://app.soubilingue.com.br/api/webhooks/asaas`,
     com os eventos de **pagamento e de estorno** marcados.
4. **Revisão jurídica** de termos, privacidade e política de reembolso.
5. **Admin → Página de vendas → Contato:** preencher e-mail, WhatsApp,
   horário, razão social, CNPJ e endereço (exigidos pelo Decreto
   7.962/2013).
6. **Admin → Custos e ferramentas:** cadastrar as ferramentas (servidor,
   Supabase, domínio, Anthropic, ElevenLabs, Asaas) e lançar as faturas
   mensais.
7. **Confirmar o preço real da ElevenLabs**, para ajustar a tabela de preços
   de IA.
8. **Apagar os tokens temporários** `COOLIFY_API_TOKEN` e
   `SUPABASE_ACCESS_TOKEN` do `.env.local` quando não forem mais necessários.

### Técnicas (próximas etapas)

- **Painel — Fase D:**
  - central de conversas com leitura registrada;
  - sinalizações automáticas para revisão humana;
  - suporte (chamados);
  - avaliação das aulas.
- **Painel — Fase E:**
  - versões do prompt no banco e playground;
  - área de aprendizagem;
  - configurações (inclui editar preços com auditoria).
- **"Fase 3" (limites e créditos):**
  - limite semanal, créditos extras, reposições com livro-razão;
  - **corrigir o contador `subscriptions.horas_utilizadas`**, que não é
    atualizado com o uso real.
- **Outros:**
  - chargeback (contestação no cartão) ainda não é tratado automaticamente;
  - e-mail de confirmação: não há serviço de e-mail configurado;
  - rótulos amigáveis para as respostas da entrevista no admin (hoje
    aparecem códigos);
  - a assinatura "Premium" da conta do dono é de teste (sem cobrança) e entra
    na receita recorrente.

## 9. Decisões do dono já tomadas

| Data | Decisão |
|---|---|
| 27/09 | Manter o **Asaas** (a Kiwify foi descartada) |
| 27/09 | Preços +R$ 9,90, 1º mês com 50% de desconto, voz do navegador no Essencial |
| 27/09 | Página de vendas e checkout mostram a mesma informação (banco é a fonte) |
| 27/09 | Reposição de aula = falha do sistema + concessão manual (o app não tem agenda) |
| 29/09 | Guardar o texto das conversas por **90 dias** |
| 29/09 | Painel na ordem A → B → C (feitas); estrutura de funções criada, hoje só "geral" em uso |

## 10. Histórico resumido

| Período | O que aconteceu |
|---|---|
| 17–24/08/2026 | Primeira versão: cadastro, 6 tutores com voz, aula por voz com transcrição, memória do aluno, horas e recargas, painel de custos de IA, videochamada Tavus (depois desativada) |
| 27/09/2026 | **Retomada:** limpeza de segurança, domínio, migração para o novo Supabase (backup restaurado), ilustrações anime, entrevista de boas-vindas, prompt v2, Fase 0 de segurança, nova página de vendas, cancelamento e reembolso, assistente de vendas, páginas legais |
| 29/09/2026 | Painel administrativo, Fases A, B e C |

Detalhe de cada entrega: `docs/changelog.md`.
