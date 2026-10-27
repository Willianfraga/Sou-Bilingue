# Modelos de e-mail do Supabase Auth

Plano A, passo A4 de `docs/plano-acao-email-e-voz.md`. Os modelos ficam
versionados aqui; o que vale em produção é o que está colado no painel.

Onde colar: Supabase → **Authentication → Emails → Templates**. Em cada
modelo, troque o **Subject** e cole o conteúdo do arquivo no corpo
(**Source**).

| Modelo no Supabase | Assunto | Arquivo |
|---|---|---|
| Confirm signup | Confirme seu cadastro no Sou Bilíngue | `confirmacao.html` |
| Reset password | Sou Bilíngue: crie sua nova senha | `recuperar-senha.html` |
| Change email address | Sou Bilíngue: confirme seu novo e-mail | `troca-email.html` |

Link mágico, convite e reautenticação não são usados (login por e-mail e
senha), por isso não têm modelo próprio.

## Por que `{{ .ConfirmationURL }}`

O cadastro e o "esqueci a senha" são pedidos pelo navegador com o fluxo PKCE
do `@supabase/ssr`. O link padrão passa pelo Supabase e volta com `?code=`,
que `/auth/callback` e `/auth/reset-password` já tratam. Não troque por
`{{ .TokenHash }}` sem ajustar `/auth/reset-password`, que só lê `code`.

## Conferir antes de colar

Abra o `.html` no navegador para ver o visual. O link aparece como
`{{ .ConfirmationURL }}` porque só o Supabase preenche o valor.
