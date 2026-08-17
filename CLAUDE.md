# Fluência Certificada — contexto do projeto

App de aprendizado de idiomas por conversa com IA. Diferencial: em vez de recompensa
em dinheiro, o aluno que cumprir a cota de aulas de **todas as semanas do mês**
recebe automaticamente um **certificado de conclusão mensal** em PDF, verificável
publicamente por código.

Idioma do produto e do código: **português do Brasil**.

## Estado atual (17 ago 2026)

**Fase 0 do roteiro — piloto manual.** Nenhuma tela de produto foi construída ainda.
O que existe até aqui é o blueprint completo em `docs/ESCOPO.md` (também publicado
como artifact — ver seção "Onde encontrar o escopo completo" abaixo) e este scaffold
inicial de código, criado por antecipação — não significa que a Fase 0/1 já estejam
concluídas.

Este arquivo existe justamente para o problema que gerou sua criação: numa sessão
anterior, o projeto só existia como uma conversa e um artifact — sem pasta, sem
`CLAUDE.md`, sem commit — e ficou difícil de encontrar depois. Sempre que uma decisão
de escopo mudar, atualize `docs/ESCOPO.md` (e o artifact, se ele continuar sendo a
versão compartilhada) **e** este arquivo.

## Onde encontrar o escopo completo

- `docs/ESCOPO.md` — versão em Markdown, controlada por este repositório.
- Artifact publicado (mesma informação, formatada): peça ao Claude Code para listar
  os artifacts da conta se o link se perder — o título é "Fluência Certificada".

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
   recalcular o custo real do Avançado).
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

## Pendências reais (não finja que estão resolvidas)

1. Regra concreta de dificuldade adaptativa e de correção que explica o porquê —
   hoje é só uma frase de intenção (seção 11 do escopo), não um critério testável.
2. Preço do plano Avançado (R$119) é ilustrativo — falta recalcular com o custo real
   de computação de LLM + STT/TTS + avaliação de pronúncia para 14h/semana.
3. Métrica de sucesso do piloto da Fase 0 ainda não definida — que número, que
   comparação, que prazo prova que o certificado sozinho sustenta o hábito.

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
