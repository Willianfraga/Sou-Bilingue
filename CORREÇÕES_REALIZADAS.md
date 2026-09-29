# Estado das correções — Sou Bilíngue

> **Documento atualizado:** leia primeiro [`docs/ESTADO_ATUAL.md`](docs/ESTADO_ATUAL.md) (estado do projeto em 29/09/2026). Este arquivo é histórico e pode estar desatualizado.


Atualizado em 2026-09-27. Este arquivo substitui a versão anterior, que marcava
como "atendidos" critérios que nunca foram testados.

## Feito no código (typecheck passa; páginas abrem no `npm run dev`)

- Middleware: `/cadastro`, `/auth/reset-password` e as APIs de cadastro/auth
  são públicas; usuário logado sem `profiles` é mandado para `/cadastro`
  (checagem feita com o cliente do próprio middleware).
- `/api/cadastro` e `/api/cadastro/onboarding`: o usuário vem da sessão, nunca
  do corpo da requisição. A escrita usa service role (não há policy de INSERT
  em `profiles`/`alunos`), sempre restrita ao `user.id` da sessão.
  `/api/cadastro` é idempotente; onboarding exige `papel = aluno`.
- `/api/tutores`: exige sessão e lê com o cliente de sessão (RLS), sem service
  role. Esconde tutores com `ativo = false`.
- Login: removido o `<form>` aninhado da recuperação de senha; o link de
  recuperação aponta para `/auth/reset-password`.
- Recuperação de senha: página `/auth/reset-password` + `POST /api/auth/reset-password`.
- Onboarding dividido em 5 páginas com o mesmo visual:
  `/cadastro/onboarding/{idioma,plano,tutor,objetivo,resumo}`. Escolhas guardadas
  em `sessionStorage` entre as páginas; salvar acontece só no resumo.
- Tutores: elenco de 6 (Luna e Theo crianças, Mei e Diego jovens, Clara e
  Seu Antônio adultos), agrupados por faixa etária, com ilustrações próprias em
  `public/tutores/*.svg`.
- Migration nova: `supabase/migrations/0011_elenco_tutores_faixa_etaria.sql`
  (idempotente; não apaga tutores).

- Cadastro com confirmação de e-mail (2026-09-27, typecheck passa, sem teste
  real): `signUp` sem sessão mostra aviso de e-mail enviado; o link cai em
  `/auth/callback`, que abre a sessão e cria o profile a partir do nome do
  metadata (`src/lib/auth/profile.ts`). Quem confirmou em outro navegador e
  entra com senha tem o profile concluído sozinho em `/cadastro`.

## Entrevista de boas-vindas (2026-09-27, publicada em produção — commit c081b4f)

Onboarding pedagógico obrigatório antes das aulas: `/boas-vindas`, 15
perguntas, rascunho automático, resumo e edição em `/aluno/perfil#preferencias`.
Respostas em `public.aluno_onboarding` (migration 0013, já aplicada no banco
`skalodmhvgvjuieesimj`). Contexto para a IA só por `buildStudentContext`
(`src/lib/onboarding/contexto.ts`), usado em `src/app/api/aula/chat/route.ts`.
Testes: `npm test` (unitários), `npm run test:integracao` (RLS no banco real),
`npm run test:e2e` (precisa de `npm run dev`/`start`). Lint (ESLint instalado
nesta rodada), typecheck e build passam. Ao publicar, todos os alunos atuais
passam pela entrevista uma vez.

## Domínio (2026-09-27)

`soubilingue.com.br`, `www.soubilingue.com.br` e `app.soubilingue.com.br`
respondem com HTTPS e abrem o app (adicionados ao app `sou-bilingue` no Coolify,
aplicado com restart, sem rebuild — continua no build `fa2d129`). Tudo acima foi
publicado em 27 set 2026 (commits e9fceac, 27f20cb, c081b4f).

## Pendente — ações manuais (só o dono do projeto consegue)

1. `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` está incompleta (15 caracteres)
   e o Supabase recusa. Copiar a chave secreta completa do painel. Sem ela,
   criar conta e salvar onboarding falham.
2. Rodar a migration 0011 no SQL Editor do Supabase. Hoje `/api/tutores`
   responde com lista vazia para usuário logado.

3. No Supabase (Authentication → URL Configuration), incluir
   `https://app.soubilingue.com.br/auth/callback` nas Redirect URLs antes de
   publicar o cadastro novo.

## Pendente — código, ainda não feito nem testado

- Testar de ponta a ponta o cadastro com confirmação de e-mail.
- `/api/auth/reset-password` usa `exchangeCodeForSession` no servidor; não foi
  testado com um e-mail real de recuperação.
- `test/e2e.auth.test.js` nunca foi executado; não há Playwright.
- Vozes de Luna e Theo são vozes adultas do ElevenLabs; faltam IDs de vozes
  infantis escolhidos pelo dono.
- `supabase/seed.sql` está quebrado (IDs de texto em colunas uuid) — não usar.
- Itens 9–16 do briefing (segredos, placeholders, auditoria de migrations,
  pagamentos Sandbox, testes, deploy no Coolify) não foram iniciados.

## Observação de ambiente

O projeto fica dentro do OneDrive, que corrompe a pasta `.next` (erro
`EINVAL readlink`). Se acontecer: parar o servidor, apagar `.next`, rodar
`npm run dev` de novo. Solução definitiva: mover o projeto para fora do OneDrive.
