# Custos de IA e voz por plano

Referência para decisões de preço, voz e horas. Atualizado em 27 set 2026.
Regras aplicadas no código: `src/lib/billing/planos.ts`.

## Custo por hora de conversa ativa

Medido na tabela `ai_usage_events` (24–27 ago 2026): uma resposta do tutor
a cada ~30 s → ~120 respostas por hora. Cotação usada: R$ 5,50/US$.

| Item | Preço | Custo/hora |
|---|---|---|
| Anthropic `claude-haiku-4-5` sem cache | US$ 1 / US$ 5 por milhão de tokens (entrada/saída) | ~US$ 0,75 |
| Anthropic com cache (a partir de 27 set) | leitura de cache US$ 0,10 por milhão | ~US$ 0,20 |
| ElevenLabs voz (`eleven_flash_v2_5`) | ~US$ 0,01 por resposta falada | ~US$ 1,17 |
| ElevenLabs transcrição (`scribe_v2`) | ~US$ 0,0004 por fala do aluno | ~US$ 0,05 |
| Voz do navegador | grátis | 0 |

**Total por hora (com cache):** voz ElevenLabs ≈ **R$ 7,81**; voz do
navegador ≈ **R$ 1,37**.

### Por que o cache não funcionava

O Haiku 4.5 só faz cache de trechos com **4.096 tokens ou mais**. O app
marcava para cache só o prompt do sistema (menor que isso), então todas as
chamadas pagavam o preço cheio (`cache_read_input_tokens` sempre 0). Desde
27 set, a última mensagem também é marcada (`src/app/api/aula/chat/route.ts`):
quando a conversa passa de 4.096 tokens, o histórico entra no cache. Confira
em `ai_usage_events.cache_read_input_tokens` depois de algumas aulas.

## Planos vigentes (tabela `planos`, migration 0014)

1ª mensalidade com 50% de desconto; preço cheio a partir do 2º mês.
Custos supondo que o aluno use **todas** as horas do plano.

| Plano | Preço | Horas/mês | Voz | Custo máximo | Resultado por aluno (2º mês em diante) |
|---|---|---|---|---|---|
| Teste 7 dias | R$ 9,90 | 5 | ElevenLabs | R$ 39,05 | −R$ 29,15 |
| Essencial | R$ 59,80 (1º mês R$ 29,90) | 12 | **navegador** | R$ 16,44 | **+R$ 43,36** |
| Fluência | R$ 109,80 (1º mês R$ 54,90) | 20 | ElevenLabs | R$ 156,20 | −R$ 46,40 |
| Premium | R$ 169,80 (1º mês R$ 84,90) | 30 | ElevenLabs | R$ 234,30 | −R$ 64,50 |

Uso a partir do qual o plano dá prejuízo (voz ElevenLabs):

| Plano | Empata em | 30% de lucro até |
|---|---|---|
| Fluência | 14 h/mês (70% das horas) | 10,8 h/mês (54%) |
| Premium | 21,7 h/mês (72% das horas) | 16,7 h/mês (56%) |

Fora da conta: taxa do Asaas, impostos, servidor (Coolify) e Supabase.

## Atualização de 07/10/2026: todos os planos com voz ElevenLabs

O dono achou a voz do navegador robotizada, e o **Essencial passou a usar a
voz ElevenLabs** (`PLANOS_COM_VOZ_DO_NAVEGADOR` vazio). A voz do navegador
ficou só como reserva quando a ElevenLabs falha.

**Medição real (aulas de 27/09 a 07/10)**, por resposta da tutora:

| Serviço | Custo por resposta | Parte do custo |
|---|---|---|
| Voz ElevenLabs | US$ 0,014 | 79% |
| Claude Haiku | US$ 0,0036 | 20% |
| Transcrição | US$ 0,0004 | 1% |

O cache segue sem efeito: as chamadas têm ~3,1 mil tokens, abaixo do mínimo
de 4.096.

Com ~120 respostas por hora, a hora sai por ~R$ 9,70 (câmbio de R$ 5,22).
Com isso, o **Essencial** (R$ 59,80, 12 h) dá prejuízo a partir de ~6 h
usadas no mês (~50% das horas).

Alternativa avaliada e ainda não adotada: Google Text-to-Speech (Neural2:
US$ 16 por milhão de caracteres, com 1 milhão grátis por mês) deixaria a
hora em ~R$ 5,40. Revisar junto com o item 9b de `docs/checklist-producao.md`.

## Pendências de decisão

- Fluência e Premium dão prejuízo se o aluno usar mais de ~70% das horas.
  Opções: voz do navegador também nesses planos, menos horas ou preço maior.
- O plano de teste (R$ 9,90) é cobrado como assinatura mensal recorrente
  com 5 h e voz ElevenLabs.
- Os números de uso vêm de poucos dias de teste; refazer esta conta com o
  uso real dos primeiros alunos.
