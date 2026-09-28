# Implantação

- **Código:** GitHub `Willianfraga/Sou-Bilingue` (público — nunca commitar
  segredos), branch `codex/sou-bilingue-deploy`.
- **Servidor:** Coolify, app `sou-bilingue`, build Nixpacks a partir do GitHub.
  Domínios: `app.soubilingue.com.br`, `soubilingue.com.br`, `www.soubilingue.com.br`.
- **Banco:** Supabase `skalodmhvgvjuieesimj` (o antigo `jlaqxvutvfdxcjdvfhos`
  foi bloqueado; restaurado do backup em 27 set 2026).

## Migrations

Ficam em `supabase/migrations/`, numeradas, todas idempotentes. Aplicar em
ordem no SQL Editor do Supabase (ou pela API de gerenciamento). Nenhuma apaga
dados. Últimas: 0012 (ilustrações), 0013 (entrevista), 0014 (preços e 1ª
mensalidade), 0015 (webhooks e endurecimento).

## Variáveis de ambiente

Lista completa (sem valores) em `.env.example`. Variáveis `NEXT_PUBLIC_*`
entram no build — marcar como *Build Variable* no Coolify e publicar de novo
ao mudar. As demais só precisam de restart.

## Publicar

1. `npm test && npx tsc --noEmit && npm run lint && npm run build`
2. Varredura de segredos no diff (repo público).
3. Commit + push na branch acima.
4. Coolify → Deploy (ou API `/api/v1/deploy?uuid=<app>`).
5. `TEST_BASE_URL=https://app.soubilingue.com.br npm run test:e2e`

## Recuperação

- Deploy quebrado: no Coolify, *Rollback* para o deploy anterior.
- Migration: todas são aditivas; para reverter, escrever a migration inversa
  (nunca editar uma já aplicada).
- Webhook com erro: ver `docs/payment-security.md` → Reprocessar.
