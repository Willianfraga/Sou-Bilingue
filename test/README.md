# Testes E2E - SouBilingue

## Descrição

Testes de autenticação e fluxos críticos da aplicação SouBilingue.

### O que é testado

- ✅ Cadastro (signup)
- ✅ Login com conta existente
- ✅ Recuperação de senha
- ✅ Proteção de rotas (públicas vs privadas)
- ✅ Validação de dados
- ✅ APIs de autenticação

## Como executar

### Pré-requisitos

1. Servidor local rodando em `http://localhost:3000`
   ```bash
   npm run dev
   ```

2. Variáveis de ambiente configuradas (`.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

### Rodar os testes

```bash
# Numa segunda aba/terminal
npm run test:e2e

# Ou
node --test test/e2e.auth.test.js
```

### Esperado

Todos os testes devem passar com status **OK**:

```
✓ Cadastro: fluxo completo (...)
  ✓ 1. Signup cria usuário no Supabase (...)
  ✓ 2. POST /api/cadastro rejeita sem sessão (...)
  ✓ 3. POST /api/cadastro rejeita dados incompletos (...)
✓ Login: fluxo completo (...)
✓ Recuperação de senha (...)
✓ Middleware: rotas públicas vs privadas (...)
✓ APIs de cadastro (...)
✓ Validações de dados (...)
```

## Notas

- Os testes fazem requisições **reais** contra o servidor local
- Cada teste de signup cria um novo usuário com timestamp único
- Não há limpeza automática de usuários de teste (usar Supabase dashboard se necessário)
- Rate limiting pode afetar testes executados muito rapidamente

## Troubleshooting

### Erro: "ECONNREFUSED"
- Servidor não está rodando em `http://localhost:3000`
- Execute `npm run dev` numa aba separada

### Erro: "Supabase credentials missing"
- Variáveis não configuradas no `.env.local`
- Copie de `.env.example` e preencha os valores

### Erro: "unauthorized"
- A sessão expirou
- Limpe cookies do navegador ou use uma sessão nova

## Próximos passos

- [ ] Testes com Playwright (navegador real)
- [ ] Testes de performance
- [ ] Testes de RLS (Row-Level Security)
- [ ] Testes de pagamento (Asaas mock)
