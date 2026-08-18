# SouBilingue — contexto do projeto

App de aprendizado de idiomas por conversa com IA. Diferencial: em vez de recompensa
em dinheiro, o aluno que cumprir a cota de aulas de **todas as semanas do mês**
recebe automaticamente um **certificado de conclusão mensal** em PDF, verificável
publicamente por código.

Nome do projeto até 17 ago 2026 era "Fluência Certificada" (codinome de blueprint,
ainda visível nos commits antigos) — renomeado pra **SouBilingue**. Domínio
confirmado: **soubilingue.com.br**.

Idioma do produto e do código: **português do Brasil**.

## Estado atual (18 ago 2026)

**Fase 1 do roteiro — MVP 100% automatizado, sem piloto manual.** O blueprint
completo está em `docs/ESCOPO.md` (também publicado como artifact — ver seção
"Onde encontrar o escopo completo" abaixo).

Do código: as 3 interfaces (aluno, responsável, criador) têm todas as telas do
esqueleto de navegação preenchidas com conteúdo real. **Autenticação de verdade
existe** (Supabase Auth, e-mail/senha) — `/login`, middleware que renova sessão e
barra rota privada, guards por papel em cada layout (`src/lib/auth/guards.ts`), sem
mais atalho de dev na home. O tutor de IA (`/aluno/aula`) fala de verdade com
Claude Opus 5. **As três interfaces leem 100% do banco real agora** — nenhuma
tela usa mock pra dado que já tem tabela (`src/lib/data/*.ts`). O motor de
fechamento mensal (`src/lib/certificacao/fechamento.ts`,
`POST /api/jobs/fechamento-mensal`) emite certificado sozinho quando o mês fecha
100%. Nenhuma tela de produto está pronta pra usuário real ainda — faltam
cadastro público, pagamento e o resto listado nas pendências abaixo.

**Confirmado visualmente em 18 ago** — não é só teste de API: rodei o servidor
local de verdade, logado com as 4 contas de teste via navegador real (Chrome
via Playwright, instalado só pra isso e removido depois — não é dependência do
projeto), e capturei as telas das 3 interfaces com dado real renderizando
certinho (progresso do aluno, chat da aula, certificados, perfil, progresso do
responsável já mostrando o mês perfeito do Pedro Fraga elegível/com certificado
emitido pelo motor de fechamento, assinaturas e cupons do admin). Achados menores,
sem gravidade: um 404 de recurso (provável favicon ausente, nunca configurado) e
um aviso de hidratação no campo de texto de `/aluno/aula` (parece heurística do
próprio Chrome sobre o campo, não reproduzido em nenhuma outra tela — vale
conferir de novo se aparecer de novo, mas não travou nada).

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

    **Primeira troca feita:** tutores (`src/lib/data/tutores.ts`) — `/aluno/perfil`,
    `/aluno/aula` e `/api/aula/chat` já leem da tabela `tutores` de verdade, via
    cliente admin (temporário — não existe login ainda, então não tem sessão pra
    satisfazer a policy de RLS que exige `auth.uid()`; trocar pelo cliente de
    sessão assim que existir). Como essas páginas são geradas estáticas no
    build, o dado do tutor fica "congelado" no que existia no banco quando
    rodou `npm run build` — sem problema pra dado quase-estático como tutor,
    mas vai exigir `export const dynamic = 'force-dynamic'` (ou revalidação)
    quando cotas/certificados por aluno forem trocados também, porque aí o
    dado muda por usuário e por tempo, não pode ficar preso ao build.
16. **Tutor de IA: Claude Opus 5, chamado só do servidor.** A chave
    (`ANTHROPIC_API_KEY`) mora em `.env.local`, nunca chega ao browser — mesma
    regra do projeto "academia flow" (segredo nunca no cliente). O contexto do
    aluno (idioma, sotaque, tutor, objetivo pessoal) vem do perfil resolvido no
    servidor, não dos argumentos que o cliente manda — hoje `src/lib/mock/perfil.ts`;
    quando existir sessão de verdade, troca pela consulta ao banco pelo aluno
    autenticado, nunca por um campo que o `fetch` do cliente possa forjar.
17. **Login por e-mail/senha (Supabase Auth), não magic link.** Decisão pragmática
    (17 ago) — magic link dependeria de e-mail configurado (SMTP, template,
    domínio de envio) que não existe ainda; senha funciona sem nenhuma peça
    externa a mais. `src/middleware.ts` renova a sessão e barra rota privada;
    `src/lib/auth/guards.ts` (`requirePapel`) é a barreira de aplicação em cima do
    RLS do banco, chamada no topo de cada layout de interface. **Cadastro público
    continua adiado** (mesma decisão 14, funil QR→venda→checkout) — as únicas
    contas que existem são as 4 de teste (`scripts/seed-usuarios-teste.mjs`:
    admin@, aluno.adulto@, responsavel@, aluno.menor@, todas @soubilingue.com.br,
    senha `Teste@123`). Trocar/remover esse script antes de qualquer divulgação
    real. `scripts/seed-dados-teste.mjs` complementa com cotas_semanais e
    certificados de exemplo pros dois alunos.

    **Interface do aluno inteira já lê do banco de verdade** (progresso,
    certificados, perfil, tutor) via `src/lib/data/{alunos,progresso,certificados,tutores}.ts`,
    usando o cliente de sessão (RLS ativo, não mais o admin) — testado com login
    real: RLS confirmado isolando um aluno do outro (a sessão do aluno adulto não
    enxerga a linha do aluno menor). `/api/aula/chat` agora exige sessão de aluno
    de verdade, sem exceção no middleware.

    **Bug de RLS encontrado e corrigido em 17 ago** (`supabase/migrations/0002_responsavel_le_profile_do_aluno.sql`,
    aplicada): a policy de `profiles` só deixava cada um ler o próprio
    registro, então o responsável via a cota/certificado/consentimento do
    aluno vinculado mas não conseguia ler o `nome` dele (ficava undefined na
    tela). Corrigido trocando a policy pra usar `app.pode_ver_aluno(id)` —
    a mesma função já usada em todo o resto do schema. Testado de novo com
    login real: `nome do aluno: Pedro Fraga` aparece certo agora.

    **As três interfaces (aluno, responsável, criador) leem 100% do banco de
    verdade agora** — nenhuma tela usa mock pra dado que já tem tabela.
    Interface do responsável via `src/lib/data/{alunos,progresso,certificados,consentimento}.ts`
    (reaproveitando as mesmas funções do aluno, filtrando pelo aluno
    vinculado). Interface do criador via `src/lib/data/admin.ts` — as 7
    telas (assinaturas, conteúdo, motor de certificação, cupons, origem,
    auditoria, parcerias), seed em `scripts/seed-admin-teste.mjs`. Testado
    com login real do admin e confirmado que um aluno comum não enxerga dado
    admin-only (`cupons` retorna vazio pra ele). O que continua mock
    (`src/lib/mock/responsavel.ts`, "limites de uso") não tem tabela no
    schema ainda, de propósito.

**Motor de fechamento mensal existe e foi testado de ponta a ponta (18 ago).**
`src/lib/certificacao/fechamento.ts` (`fecharMesDoAluno`, `fecharMesDeTodosOsAlunos`)
implementa a regra do § 05: só emite se as 4 semanas do mês existirem e
baterem 100% da cota, nunca por aula/semana avulsa. Exposto em
`POST /api/jobs/fechamento-mensal`, protegido por `CRON_SECRET` (header
`Authorization: Bearer`, não sessão de usuário — mesmo padrão do
`/api/jobs` do academia flow) — por isso está nos caminhos públicos do
middleware, a própria rota recusa quem não manda o token certo. Ainda não
tem cron de verdade chamando isso (Vercel Cron/n8n) — só testado
manualmente. Testado contra o banco real: aluno com mês perfeito (o
"aluno.menor" semeado) recebeu o certificado automaticamente; aluno com
semana incompleta ficou de fora; rodar o job de novo pro mesmo mês não
duplica (idempotente, tanto pela checagem prévia quanto pelo
`unique(aluno_id, mes_referencia)` do banco).

## Ideia em aberto, ainda não decidida

**Comissão pra escola via link de afiliado (17 ago).** Separado do cupom de
desconto (§ 12, que dá desconto pro aluno) — para escolas particulares, a ideia
é um link de afiliado onde a escola ganha uma **porcentagem por aluno
matriculado**, com o pagamento da comissão indo **direto pra escola** via uma
**plataforma de afiliados externa** (não construída aqui). O próprio usuário
disse que ainda vai amadurecer os detalhes — não implementar nada disso ainda;
`parcerias_escolas` continua só como rastreio de prospecção
(contatada/negociando/fechada), sem campo de comissão.

## Pendências reais (não finja que estão resolvidas)

1. Regra concreta de dificuldade adaptativa e de correção que explica o porquê —
   hoje é só uma frase de intenção (seção 11 do escopo), não um critério testável.
2. Preço do plano Avançado (R$119) é ilustrativo — falta recalcular com o custo real
   de computação de LLM + STT/TTS + avaliação de pronúncia para 14h/semana.
3. Métrica de sucesso pós-lançamento ainda não definida — sem piloto manual, que
   número/comparação/prazo, acompanhado por analytics automatizado, prova que o
   certificado sozinho sustenta o hábito.
4. O trecho **QR de origem → página de vendas → cadastro → pagamento Asaas**
   nunca foi testado, nem com conta de teste — nem existe código ainda (§ 12
   segue adiado). O resto do fluxo (login → app → aula com IA → fechamento do
   mês → certificado) **já foi confirmado visualmente em 18 ago**, ver "Estado
   atual" acima — falta só ligar a ponta de aquisição/pagamento nisso.

## Otimizações de custo de IA implementadas

**Problema encontrado em 19 ago:** `/api/aula/chat` estava usando `claude-opus-5`
(US$ 15/M tokens entrada), queimando créditos rápido em testes de desenvolvimento.

**Correção:**
- Modelo padrão trocado para `claude-haiku-4-5-20251001` (US$ 0,80/M entrada — 19x mais barato)
- **Prompt caching** ativado na chamada — reduz custo em ~90% em mensagens repetidas com mesmo prompt
- Configurável via `ANTHROPIC_MODEL` em `.env` — permite trocar pra Opus/Sonnet em produção se necessário

**Economia estimada:** 1 chat de 5 turnos:
- Antes (Opus): ~$0,30/chat
- Depois (Haiku + cache): ~$0,02/chat
- **Redução: 85-90%**

Aproveite o servidor rodando em dev pra testar o chat sem queimar crédito de verdade agora.

## Por onde retomar (feito em 18 ago, sessão pode continuar direto daqui)

Se abrir uma sessão nova amanhã, não precisa re-explicar nada disso — está tudo
commitado. Nessa ordem, o que falta:

1. **Cron de verdade** pro `/api/jobs/fechamento-mensal` (Vercel Cron ou n8n) —
   hoje só dá pra disparar na mão. É rápido, só configuração.
2. **Geração real de PDF** do certificado — hoje só existe a linha no banco
   com `codigo_verificacao`, sem PDF nenhum gerado.
3. **Cadastro público + pagamento (Asaas)** — o funil inteiro (§ 12) que ficou
   adiado desde o início; é a peça que falta pra ter usuário real de verdade,
   não só conta de teste semeada na mão.
4. Servidor local pode estar rodando ainda de sessões anteriores
   (`localhost:3000`) — se não estiver, `npm run dev` na pasta do projeto.
   Contas de teste em `scripts/seed-usuarios-teste.mjs` (senha `Teste@123`
   pra todas): `admin@`, `aluno.adulto@`, `aluno.menor@`, `responsavel@`,
   todas `@soubilingue.com.br`.

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
