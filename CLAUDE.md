# SouBilingue — contexto do projeto

App de aprendizado de idiomas por conversa com IA. Diferencial: em vez de recompensa
em dinheiro, o aluno que cumprir a cota de aulas de **todas as semanas do mês**
recebe automaticamente um **certificado de conclusão mensal** em PDF, verificável
publicamente por código.

Nome do projeto até 17 ago 2026 era "Fluência Certificada" (codinome de blueprint,
ainda visível nos commits antigos) — renomeado pra **SouBilingue**. Domínio
confirmado: **soubilingue.com.br**.

Idioma do produto e do código: **português do Brasil**.

## Estado atual (17 ago 2026)

**Fase 1 do roteiro — MVP 100% automatizado, sem piloto manual.** O blueprint
completo está em `docs/ESCOPO.md` (também publicado como artifact — ver seção
"Onde encontrar o escopo completo" abaixo). Do código, existe o esqueleto de
navegação das 3 interfaces (aluno, responsável, criador) e quatro telas reais da
interface do aluno: Progresso do mês, Certificados e Perfil (dado mock, sem banco
por trás) e **Aula — essa com o tutor de IA já ligado de verdade** (Claude Opus 5,
via `src/app/api/aula/chat/route.ts`, `ANTHROPIC_API_KEY` em `.env.local`). O
resto das telas são placeholder —
não significa que a Fase 1 já esteja concluída.

Decisão importante desta rodada: **não existe fase de piloto manual nem revisão
humana em etapa nenhuma.** O trabalho manual do dono do produto é só divulgação
(panfletagem em escolas com QR Code). Cadastro, pagamento, validação de aula e
emissão de certificado têm que rodar sozinhos desde o primeiro aluno — não é
aceitável nenhum fluxo que dependa de alguém do time apertar um botão por aluno.

**Ordem de construção (não é ordem de escopo):** página de vendas e checkout
(seção 12 do escopo) ficam para depois. A construção atual foca nas 3 interfaces do
aplicativo (aluno, responsável, criador) — primeiro o esqueleto de navegação de cada
uma, com telas vazias, depois o conteúdo de cada tela.

Este arquivo existe justamente para o problema que gerou sua criação: numa sessão
anterior, o projeto só existia como uma conversa e um artifact — sem pasta, sem
`CLAUDE.md`, sem commit — e ficou difícil de encontrar depois. Sempre que uma decisão
de escopo mudar, atualize `docs/ESCOPO.md` (e o artifact, se ele continuar sendo a
versão compartilhada) **e** este arquivo.

## Onde encontrar o escopo completo

- `docs/ESCOPO.md` — versão em Markdown, controlada por este repositório.
- Artifact publicado (mesma informação, formatada): peça ao Claude Code para listar
  os artifacts da conta se o link se perder — o título é "SouBilingue".

## Decisões já fechadas (não reabrir sem motivo novo)

1. **Sem recompensa financeira.** Nenhum cashback, Pix ou valor em dinheiro em
   nenhuma etapa. O único reconhecimento é o certificado mensal. Isso tira o produto
   da zona de regulação do Banco Central e do risco de menor de idade recebendo
   dinheiro — não reintroduza um mecanismo financeiro sem revisar esse motivo.
2. **Certificado é só mensal.** Não existe certificado por aula ou por semana — vira
   spam de PDF e perde valor. Só sai se **todas as semanas do mês** baterem 100% da
   cota do plano.
3. **Cota semanal não acumula.** Aula não usada na semana some, não passa pra
   seguinte. Toda semana a cota volta a valer do zero.
4. **Gate por idade via consentimento LGPD, não custódia financeira.** 18+: cadastro
   próprio. Menor de 18: precisa de consentimento do responsável (Art. 14 LGPD) antes
   de liberar o uso. O responsável paga o plano e acompanha o progresso, mas não
   controla nenhum saldo do aluno.
5. **Sem verificação por foto/biometria.** Validação da aula é só por nota mínima de
   qualidade (pronúncia, gramática, participação).
6. **3 planos por dias de aula na semana:** Básico (3d/6h), Intermediário (5d/10h),
   Avançado (7d/14h) — aula de 2h/dia, preços ilustrativos (R$49/79/119, ainda sem
   recalcular o custo real do Avançado). Validação da aula é sempre automática, por
   nota mínima de qualidade — **nenhum plano tem revisão humana**, nem o Avançado.
7. **3 interfaces:** aluno, responsável (só existe se o aluno for menor) e criador
   (CMS/admin/certificação).
8. **Todo tutor de IA segue a mesma diretriz de comportamento** — amigável, corrige
   sem constranger, parabeniza progresso pequeno, pergunta o que o aluno quer
   praticar em vez de roteiro fixo — independente de qual avatar (elenco diverso)
   o aluno escolher. Isso é prompt/instrução do modelo, não personalização visual.
9. **Entram já no MVP (Fase 1)**, decidido na rodada de 17 ago: cenários reais de
   conversa (aeroporto, entrevista, restaurante), lembrete no horário exato da aula,
   portfólio de certificados exportável em PDF único, prospecção de parceria com
   escolas, cápsulas de cultura por idioma e sotaque regional escolhível (aceitando o
   custo extra de voz por variante desde o início).
10. **Zero operação manual desde o aluno #1** — sem piloto, sem revisão humana. O
    certificado é válido e verificável desde o primeiro emitido, não é uma versão
    piloto/beta. Papel do dono do produto: só divulgação.
11. **Pagamento via Asaas** — mesmo gateway do projeto "academia flow", cobrança
    recorrente mensal (Pix, cartão, boleto) com confirmação automática por webhook.
12. **Aquisição por QR Code rastreável por escola/leva** — cada remessa de panfleto
    carrega um código de origem no link de cadastro, para o painel do criador
    mostrar de qual escola veio cada aluno.
13. **Cupom de desconto por escola** — cadastrado dentro do painel do criador (nome
    livre, normalmente o nome da escola), válido só na primeira mensalidade. Como o
    QR do panfleto já carrega o código de origem da escola (decisão 12), o link pode
    vir com o cupom da mesma escola pré-preenchido — a pessoa não digita nada, e
    origem + desconto saem do mesmo mecanismo.
14. **O QR Code não leva direto pro cadastro — leva pra uma página de vendas
    pública** (sem login), que apresenta o produto e os 3 planos com o cupom da
    escola já identificado. Só depois de escolher o plano é que entra cadastro →
    checkout. Checkout é uma etapa própria: resumo do pedido, cupom aplicado,
    escolha de método de pagamento (Pix/cartão/boleto) via Asaas, confirmação
    automática por webhook, acesso liberado só depois da confirmação.
15. **Banco: projeto Supabase próprio, separado do "academia flow".** São dois
    projetos em andamento diferentes — nunca reaproveitar o Supabase do academia
    flow aqui, mesmo sendo a mesma stack/conta. Criado em 17 ago 2026
    (`jlaqxvutvfdxcjdvfhos.supabase.co`); credenciais em `.env.local` (nunca
    commitadas), conexão testada e confirmada. Usa o esquema novo de chaves do
    Supabase (`sb_publishable_...` / `sb_secret_...`, não o legado
    anon/service_role JWT) — os clientes em `src/lib/supabase/` funcionam com
    qualquer um dos dois formatos, nada a mudar no código.

    **Migration aplicada em 17 ago 2026** (rodada no SQL Editor do painel) —
    as 13 tabelas existem, RLS ativo, seed confirmado (4 tutores, 3 regras de
    certificação, 3 linhas de conteúdo em Espanhol). Testado com as duas
    chaves: anon (RLS filtra tutores sem sessão logada — esperado) e service
    role (bypassa RLS, seed visível). Próximo passo: trocar `getXxxMock()` de
    `src/lib/mock/*.ts` por consultas reais, tabela por tabela.
16. **Tutor de IA: Claude Opus 5, chamado só do servidor.** A chave
    (`ANTHROPIC_API_KEY`) mora em `.env.local`, nunca chega ao browser — mesma
    regra do projeto "academia flow" (segredo nunca no cliente). O contexto do
    aluno (idioma, sotaque, tutor, objetivo pessoal) vem do perfil resolvido no
    servidor, não dos argumentos que o cliente manda — hoje `src/lib/mock/perfil.ts`;
    quando existir sessão de verdade, troca pela consulta ao banco pelo aluno
    autenticado, nunca por um campo que o `fetch` do cliente possa forjar.

## Pendências reais (não finja que estão resolvidas)

1. Regra concreta de dificuldade adaptativa e de correção que explica o porquê —
   hoje é só uma frase de intenção (seção 11 do escopo), não um critério testável.
2. Preço do plano Avançado (R$119) é ilustrativo — falta recalcular com o custo real
   de computação de LLM + STT/TTS + avaliação de pronúncia para 14h/semana.
3. Métrica de sucesso pós-lançamento ainda não definida — sem piloto manual, que
   número/comparação/prazo, acompanhado por analytics automatizado, prova que o
   certificado sozinho sustenta o hábito.
4. Fluxo ponta a ponta (cadastro → QR de origem → pagamento Asaas → aula → validação
   → certificado) ainda não foi testado nem uma vez, nem com conta de teste — antes
   da primeira divulgação real vale rodar isso de ponta a ponta pelo menos uma vez.

## Stack (decisão pragmática desta sessão, não do documento de escopo)

O escopo original (seção 07) recomenda Flutter/React Native + Node/NestJS. Este
scaffold usa **Next.js + TypeScript + Tailwind** (mesma stack do projeto
"academia flow") para permitir validar mais rápido sozinho, com o painel do criador
vivendo no mesmo app por enquanto. Web app nativo (Flutter/RN) fica para a Fase 2+,
depois de provar que o certificado sozinho sustenta o hábito no piloto. Se essa
decisão mudar, atualize esta seção.

## Comandos

```bash
npm install
npm run dev         # servidor de desenvolvimento
npm run typecheck   # tsc --noEmit
npm run build        # build de produção
```
