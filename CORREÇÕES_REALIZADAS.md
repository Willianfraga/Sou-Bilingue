# Estado das correções — Sou Bilíngue

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

## Pendente — ações manuais (só o dono do projeto consegue)

1. `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` está incompleta (15 caracteres)
   e o Supabase recusa. Copiar a chave secreta completa do painel. Sem ela,
   criar conta e salvar onboarding falham.
2. Rodar a migration 0011 no SQL Editor do Supabase. Hoje `/api/tutores`
   responde com lista vazia para usuário logado.

## Pendente — código, ainda não feito nem testado

- Cadastro com confirmação de e-mail habilitada: `signUp` não cria sessão e
  `/api/cadastro` responde 401. Falta callback de confirmação e criação do
  profile depois dela (ou trigger segura em `auth.users`).
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
