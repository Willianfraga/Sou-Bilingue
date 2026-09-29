# Agente de manutenção

Duas peças, criadas em 29/09/2026:

| Peça | Arquivo | O que faz |
|---|---|---|
| **Verificador de saúde** | `scripts/saude.mjs` (regras em `scripts/saude/regras.mjs`) | Confere o sistema em cerca de 1 minuto e **só lê**, sem alterar nada |
| **Agente de manutenção** | `.claude/agents/manutencao.md` | Instruções para o Claude Code verificar, investigar e corrigir, sempre pedindo sua aprovação antes de publicar |

## 1. Verificar o sistema (sem IA)

No terminal, dentro da pasta do projeto:

```
npm run saude
```

O verificador mostra ✔ (ok), ⚠ (aviso) e ✖ (problema) para:

- **Site:** página inicial, login e proteção do webhook do Asaas.
- **Pagamentos:** avisos do Asaas com erro ou travados nos últimos 7 dias.
- **IA:**
  - erros e taxa de falha por provedor nas últimas 24 horas;
  - **créditos da Anthropic**, com um teste mínimo de 1 token (custa frações
    de centavo).
- **Reembolsos:** estorno que falhou, análise parada há mais de 3 dias,
  estorno em processamento há mais de 10 dias.
- **Privacidade:** conversas com texto guardado há mais de 90 dias (sinal de
  que a limpeza automática parou).
- **Custos:** os mesmos alertas da área Custos e ferramentas.
- **Banco:** contas de teste esquecidas.
- **Código:** alterações não salvas e commits não enviados ao GitHub.
- **Testes:** testes unitários.

Opções:

| Comando | Efeito |
|---|---|
| `npm run saude -- --rapido` | Não roda os testes |
| `npm run saude -- --completo` | Também confere tipos e lint |
| `npm run saude -- --sem-ia` | Não testa a conta da Anthropic |
| `npm run saude -- --json` | Saída para programas e agentes |

Quando há algum ✖, o comando termina com código 1. Assim, uma rotina
agendada sabe que precisa avisar.

## 2. Usar o agente (com IA)

Abra o Claude Code na pasta do projeto (no VS Code ou no terminal) e peça,
por exemplo:

- "Use o agente **manutencao** e verifique o sistema."
- "Use o agente manutencao: um aluno disse que a aula não responde. Investigue."
- "Use o agente manutencao para corrigir o erro X e me mostre antes de publicar."

O agente segue as regras do arquivo:
- lê `docs/ESTADO_ATUAL.md`;
- roda `npm run saude`;
- investiga antes de mexer;
- testa tudo;
- registra no changelog;
- **para e pede sua aprovação** antes de salvar no GitHub, publicar, mexer
  no banco, em pagamentos, preços, prompt do professor ou dados de alunos.

Ele **nunca**:
- grava senhas ou chaves (o repositório é público);
- envia mensagens a alunos;
- decide reembolso, suspensão ou anonimização;
- apaga dados financeiros.

Para ver ou editar as instruções: comando `/agents` no Claude Code, ou o
arquivo `.claude/agents/manutencao.md`.

## 3. Checagem diária automática (próximo passo, opcional)

Dá para agendar o agente para rodar todo dia de manhã e te mandar o
resultado. Isso é feito com o comando `/schedule` do Claude Code, que cria
uma rotina na nuvem. Antes de ligar, considere:

- **A rotina na nuvem não tem o seu `.env.local`.** Sem chaves, ela só confere
  o site (e as checagens de banco e da Anthropic aparecem como puladas).
- **Para a checagem completa na nuvem**, crie chaves **separadas e só de
  leitura** para o agente e guarde-as no cofre de segredos do serviço, nunca
  em arquivo.
- **Cada execução consome créditos** da Anthropic (pouco, mas consome).
- A rotina só **relata**. Qualquer correção continua passando pela sua
  aprovação.

Uma alternativa simples, sem nuvem: rodar `npm run saude` no seu computador
quando for trabalhar no projeto.

## 4. Ajustar as regras

- **Limites dos avisos** (ex.: 20% de erro, 3 dias em análise): em
  `scripts/saude/regras.mjs`, com testes em `test/saude.test.mjs`.
- **Comportamento do agente:** em `.claude/agents/manutencao.md`.
