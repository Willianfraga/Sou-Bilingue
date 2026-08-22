# 🔐 Credenciais de Teste — SouBilingue

**Data de criação:** 22 de agosto de 2026  
**Versão:** 1.0

---

## 🎯 Acesso do Aluno

### Dados de Login

```
Email:    aluno@soubilingue.dev
Senha:    Teste@2026!
```

### Perfil do Aluno

```
Nome:          Lucas Melo
Tutor:         Clara (avatar emoji 🧑‍🏫)
Idioma:        Espanhol
Sotaque:       Espanha
Plano:         Intermediário (5 dias/semana)
Objetivo:      Viajar pela América Latina
Status:        Aluno ativo, pronto para aulas
Idade:         Maior de 18 anos (sem necessidade de responsável)
```

---

## 📍 Como Acessar

### Local (Desenvolvimento)

```bash
# 1. Instalar dependências
cd C:\Users\Willian\ fraga\Documents\Sou\ Bilingue\soubilingue
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas chaves Supabase, Anthropic, etc

# 3. Rodar servidor de desenvolvimento
npm run dev

# 4. Abrir navegador
http://localhost:3000/login

# 5. Fazer login com credenciais acima
```

### Em Produção (após deploy)

```
https://seu-dominio.com/login
```

Mesmas credenciais acima.

---

## 🎮 Como Testar

### 1. Fazer Login

1. Acesse http://localhost:3000/login
2. Ou entre direto em http://localhost:3000/aluno (já redireciona para login se não autenticado)
3. Use as credenciais acima

### 2. Ir para a Aula

```
http://localhost:3000/aluno/aula
```

Ou clique em **"Praticar"** na navegação lateral.

### 3. Testar Conversa com Tutor

1. Clique em **"🎤 Iniciar conversa"**
2. Navegador pede permissão de microfone → **Clique em "Permitir"**
3. A tutora Clara começa a falar: *"Ola! Vamos iniciar uma conversa de pratica..."*
4. Microfone abre automaticamente
5. Fale em Espanhol quando ouvir o bip
6. Sistema reconhece sua fala e envia para Claude Haiku
7. Claude responde (exemplo: "Ola! Como você está?")
8. Tutora fala a resposta
9. Microfone abre novamente
10. Ciclo continua...

### 4. Ver Outras Telas

- **Dashboard:** http://localhost:3000/aluno (progresso do mês)
- **Certificados:** http://localhost:3000/aluno/certificados
- **Perfil:** http://localhost:3000/aluno/perfil

### 5. Testar em Mobile

Redimensionar navegador para **375x812px** (tamanho de iPhone):
- Chrome DevTools → Clique no ícone de smartphone
- Ou abra em um celular real: `http://seu-ip-local:3000`

---

## ⚙️ Dados do Banco

Se quiser resetar ou criar novos alunos:

### Conectar ao Supabase

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Execute queries:

```sql
-- Ver todos os alunos
SELECT id, nome, idioma, plano FROM profiles
INNER JOIN alunos ON profiles.id = alunos.id;

-- Ver tutores
SELECT id, nome, descricao FROM tutores;

-- Resetar aluno (cuidado!)
DELETE FROM profiles WHERE id = 'aluno-lucas';

-- Inserir novo aluno (após seed.sql)
-- Ver supabase/seed.sql para exemplo
```

---

## 🔧 Configuração de Variáveis de Ambiente

No `.env.local`, certifique-se que tem:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-v0-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Tokens de segurança
CRON_SECRET=seu_token_aleatorio
ASAAS_WEBHOOK_TOKEN=seu_token_aleatorio
```

---

## ⚠️ Possíveis Erros & Soluções

### "Erro ao conectar ao banco"
```
Causa: Supabase URL ou chave inválida
Solução: Verificar .env.local
```

### "Tutor não responde"
```
Causa: ANTHROPIC_API_KEY inválido
Solução: Gerar nova chave em https://console.anthropic.com
```

### "Microfone não abre"
```
Causa: Navegador precisa de HTTPS em produção, ou permissão negada
Solução: 
  - Permitir microfone no browser
  - Usar localhost em dev (sem SSL)
  - Usar HTTPS em produção
```

### "Chat carrega muito lentamente"
```
Causa: Conexão com Anthropic lenta ou muitas requisições
Solução: 
  - Verificar latência de rede
  - Verificar limite de quota na Anthropic
  - Usar Chrome DevTools para debugging
```

---

## 🎯 Checklist de Teste Completo

- [ ] Login com email/senha funciona
- [ ] Dashboard mostra progresso (Agosto 2026, Plano Intermediário)
- [ ] Clique em "Aula" leva a `/aluno/aula`
- [ ] Avatar da tutora aparece (emoji ou foto)
- [ ] Botão "Iniciar conversa" funciona
- [ ] Navegador pede permissão de microfone
- [ ] Tutora fala ("Ola! Vamos iniciar...")
- [ ] Microfone abre após tutora terminar
- [ ] Falar em Espanhol funciona (STT)
- [ ] Claude responde com mensagem apropriada
- [ ] Tutora fala a resposta (TTS)
- [ ] Mensagens aparecem na ordem certa (tutor → aluno)
- [ ] Botões de ação aparecem (🔊 e 📝)
- [ ] Botão "Pausar conversa" funciona
- [ ] Layout é responsivo em mobile (375px)
- [ ] Sem scroll horizontal em nenhuma resolução
- [ ] Botões são fáceis de clicar (44x44px+)

---

## 📊 Dados de Teste Incluídos

### Tutores (seed.sql)

```
1. Clara      - Espanhol   - Foto de mulher (Unsplash)
2. Marco      - Francês    - Foto de homem (Unsplash)
3. Sophia     - Inglês     - Foto de mulher (Unsplash)
4. Wei        - Mandarim   - Foto de homem (Unsplash)
```

### Alunos (seed.sql)

```
1. Lucas Melo
   - Email: aluno@soubilingue.dev
   - Tutor: Clara
   - Idioma: Espanhol
   - Plano: Intermediário
   - Status: Ativo
```

---

## 🚀 Próximos Passos

Após testar localmente:

1. **Deploy em staging:** Railway/Vercel para testes em produção
2. **Teste com device real:** Abrir em iPhone/Android
3. **Teste de pagamento:** Integrar Asaas sandbox
4. **Teste de certificado:** Simular 4 semanas completas
5. **Feedback & ajustes:** Coletar feedback do usuário

---

## 📝 Notas

- Estas credenciais são apenas para **desenvolvimento e teste**
- Em produção, cada aluno terá suas próprias credenciais
- O seed.sql pode ser deletado após popular dados iniciais
- Não compartilhar `SUPABASE_SERVICE_ROLE_KEY` ou `ANTHROPIC_API_KEY`

---

**Criado em:** 22 de agosto de 2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para teste
