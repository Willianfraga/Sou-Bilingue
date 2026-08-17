# Fluência Certificada — blueprint de produto

*Criado 16 ago 2026 · atualizado 17 ago 2026. Também publicado como artifact
("Fluência Certificada") para leitura formatada — peça ao Claude Code para
listar os artifacts da conta se o link se perder.*

Um app de idiomas que reconhece o esforço do mês com um certificado — sem dinheiro
no meio do caminho. Três interfaces (aluno, responsável, criador) sobre uma trilha
de aprendizado por conversa com IA, com base no que a referência analisada (Lucida)
faz bem, e no que ela deixa em aberto.

Idiomas planejados: **Espanhol, Francês, Inglês, Mandarim, Italiano.**

Estamos ainda na etapa de amarrar o escopo — nenhuma linha de código do aplicativo
em si foi escrita quando este documento nasceu. É o registro vivo de cada decisão
tomada desde a análise das 34 imagens da pasta `app bilingue ai` e do site
getlucida.com. Na rodada de 17 ago, as quatro frentes que estavam em aberto (seção
10) viraram decisão — todas entraram no MVP (Fase 1), sem esperar as fases seguintes.

## 01 · O que a referência ensina

Lucida é um bom mestre de UX, um mau mestre de modelo de negócio. O site descreve o
Lucida como plataforma corporativa: empresas contratam para treinar o inglês falado
de vendedores, atendentes e gestores. Quem paga é a empresa-cliente, não a família.
O app analisado nas imagens é o app do aluno desse produto.

**Vale copiar:**
- Onboarding que pergunta o motivo de aprender e autoavalia o nível (A1–B2) antes de
  montar a trilha
- Trilha em mapa de nós por nível CEFR, com cartão de vocabulário + frases de
  exemplo antes de cada lição
- Tutor com avatar de IA, conversa por voz ou texto, atalho de tradução e áudio
  embutido em cada fala
- Dois modos de fala — "toque para falar" e "fala automática" — e escolha de
  sotaque por região
- Sequência diária (streak) e modal de saída para reduzir abandono

**Não existe — é o espaço em branco:**
- Nenhuma interface de responsável/família
- Nenhum mecanismo de reconhecimento formal do progresso (certificado, selo
  verificável)
- Nenhuma noção de "plano" pensado para adolescente + quem paga a conta
- Nenhuma lógica de plano por carga horária semanal

## 02 · A ideia central

**Reconhecimento certificado, não dinheiro em jogo.** O dinheiro foi cortado do
mecanismo: recompensa financeira automática abre porta para má-fé, e o aprendizado
do idioma já é, por si só, o benefício que justifica o esforço.

No lugar do cashback, o sistema acompanha o mês inteiro em silêncio: se o aluno
cumprir a cota de aulas de todas as semanas, recebe automaticamente, sem ninguém do
time apertar botão, um único certificado de conclusão mensal em PDF. Só um por mês —
um certificado por aula viraria spam de PDF e perderia o valor rápido.

> **Decidido:** o gate por idade continua, agora por consentimento, não por
> dinheiro. 18+: cadastro autossuficiente. Menor de 18: só é liberado depois que um
> responsável legal consente com o uso dos dados do aluno, como a LGPD exige para
> menores (Art. 14). O responsável aprova o consentimento, paga o plano e acompanha
> o progresso — sem dinheiro circulando de volta.

## 03 · As três interfaces

**Interface do aluno** — estudar e conquistar o certificado do mês:
- Escolhe idioma (dos 5) e sotaque regional, faz teste de nível e escolhe o plano —
  sozinho se maior de idade, com aprovação do responsável se menor
- Escolhe o tutor entre um elenco diverso de IA (homens, mulheres, meninos, meninas,
  senhores e senhoras, de diferentes etnias) e conversa por texto ou voz
- Aula em 3, 5 ou 7 dias da semana conforme o plano — 2h por dia, sem acumular duas
  no mesmo dia para compensar falta
- Acompanha na tela o progresso do mês (dias cumpridos x restantes)
- Acervo pessoal de certificados (um por mês) + portfólio único em PDF juntando
  todos eles
- No fechamento do mês, se bateu a cota em todas as semanas, o certificado sai
  sozinho

**Interface do responsável** — existe só quando o aluno é menor:
- Consente com o cadastro e uso dos dados do menor (LGPD)
- Contrata e paga o plano
- Acompanha progresso, cota semanal e acervo de certificados
- Recebe resumo semanal automático do progresso, sem precisar abrir o app
- Define limites de uso e recebe alertas de comportamento fora do padrão
- Canal com suporte/professor para dúvidas pedagógicas

**Interface do criador** — operar o negócio com segurança:
- CMS de conteúdo por idioma e nível
- Motor de certificação configurável (modelo do certificado + regras de validação)
- Trilha de auditoria do consentimento LGPD
- Painel de assinaturas, retenção e conclusão de aulas
- Página pública para conferir a autenticidade de qualquer certificado
- Painel de prospecção de parcerias com escolas

> **Decidido:** todo tutor segue o mesmo jeito de ensinar, não importa qual avatar o
> aluno escolha — amigável e paciente, corrige com cuidado sem constranger,
> parabeniza e motiva sempre que possível, e abre cada aula perguntando o que o
> aluno quer praticar (em vez de roteiro fixo). É diretriz de comportamento do
> modelo de IA (prompt/instrução), não personalização visual.

## 04 · Os três planos

| Plano | Nível alvo | Dias de aula/semana | Carga semanal | Mensalidade* | Certificado |
|---|---|---|---|---|---|
| Básico | A1–A2 | 3 dias | 6h | R$ 49 | Cota cumprida nas 4 semanas do mês |
| Intermediário | B1–B2 | 5 dias | 10h | R$ 79 | Idem + nota mínima de pronúncia/gramática |
| Avançado | C1+ | 7 dias | 14h | R$ 119 | Idem + revisão amostral humana |

\* Uma aula de 2h por dia, nos dias que o plano define. Preços são ilustrativos — o
Avançado embute 14h/semana de conversa com IA, bem mais custo de computação que os
outros planos; **falta recalcular a mensalidade com o custo real por hora antes de
fechar o preço** (pendência aberta). Cada certificado carrega um código de
verificação público.

## 05 · O motor de certificação

Um só certificado por ciclo — o mensal. Não existe certificado por aula. A cota
semanal não acumula: o que não for usado até o fim da semana some, e toda semana ela
volta a valer do zero. O certificado só sai se **todas as semanas do mês** baterem
100% da cota. Disparo 100% automático.

1. **Matrícula** — responsável (se menor) ou o próprio aluno (se maior) contrata o
   plano e entra na agenda semanal.
2. **Cota da semana** — 3, 5 ou 7 dias de aula conforme o plano, 2h por dia.
3. **Aula realizada** — conversa guiada com o tutor de IA, dentro da janela da
   semana corrente.
4. **Validação** — nota mínima de qualidade (pronúncia, gramática, participação)
   decide se a aula conta como cumprida.
5. **Fim da semana** — aula não usada não acumula; a cota zera e recomeça.
6. **Fechamento do mês** — todas as semanas bateram 100%? O sistema dispara sozinho
   o certificado de conclusão mensal.
7. **Acervo e verificação** — um certificado por mês conquistado, conferível
   publicamente pelo código de verificação.

## 06 · O que não pode ser ignorado

Tirar o dinheiro do mecanismo elimina a maior parte dos riscos regulatórios (Banco
Central, menor recebendo Pix, escrutínio de loja de app por parecer aposta). Sem
verificação por foto, também não há dado biométrico para proteger. Sobram dois
pontos:

- **Certificado também pode ser falsificado.** Precisa de código/QR verificável numa
  página pública — não pode ser um PDF estático que qualquer editor falsifica.
- **Sem gancho financeiro, a retenção depende só da experiência.** Vale medir de
  perto, no piloto manual da Fase 0, se o certificado sozinho segura o engajamento —
  é a maior incógnita do modelo, e ainda não tem métrica de sucesso definida
  (pendência aberta).

## 07 · Arquitetura recomendada

- **App:** Flutter ou React Native para aluno e responsável no mesmo app (perfis
  distintos); painel web separado para o criador. *(Este repositório usa Next.js
  como decisão pragmática — ver `CLAUDE.md`.)*
- **Backend:** Node/NestJS + Postgres + Redis (streak/gamificação) + fila (BullMQ)
  para gerar/assinar certificados em lote.
- **Tutor de IA:** LLM para o diálogo (ex. Claude) + STT/TTS + API dedicada de
  avaliação de pronúncia — dado objetivo que decide se a aula é válida.
- **Motor pedagógico:** fila de repetição espaçada (tipo SM-2) + dificuldade
  adaptativa em tempo real.
- **Certificação:** geração de PDF por template (nome, mês, plano, idioma,
  assinatura digital/hash) + página web de verificação por código + portfólio único
  (todos os certificados do aluno num PDF).
- **Agenda semanal:** job que zera a cota no início de cada semana e fecha o mês
  verificando 100% em todas.
- **Conteúdo:** curadoria humana por idioma além da IA — mandarim (tons),
  francês/italiano (gênero e conjugação) custam mais que os outros.
- **Sotaque regional:** decidido que entra desde o MVP (Fase 1), aceitando o custo
  extra de voz por variante desde o início.

## 08 · Roteiro por fases

- **Fase 0 — Piloto manual, sem produto ainda.** 20–50 alunos reais, 1 idioma,
  certificados montados manualmente. Objetivo: descobrir se o certificado sozinho
  sustenta o hábito, antes de automatizar.
- **Fase 1 — MVP.** App do aluno + backoffice simples. Ainda 1 idioma, mas já com
  sotaque regional escolhível, cápsulas de cultura, cenários reais de conversa,
  lembrete no horário exato, portfólio exportável em PDF e resumo semanal ao
  responsável. Certificado semi-manual, revisado antes de sair. Prospecção de
  parceria com escolas começa em paralelo.
- **Fase 2 — Automação.** Interface do responsável em produção; PDF automático;
  motor de cota semanal ligado; página pública de verificação no ar.
- **Fase 3 — Expansão de idiomas.** Priorizar o segundo idioma pela demanda real
  observada nas fases 0 e 1 (o gancho cultural do Mandarim não muda essa ordem).
  Candidatos além dos 5: alemão, japonês, coreano.
- **Fase 4 — Novas fontes de receita.** Transformar a prospecção de parcerias com
  escolas (iniciada na Fase 1) em contratos fechados, vendendo em lote.

## 09 · Onde estamos

**Fechado:**
- ✓ Sem recompensa financeira — reconhecimento 100% por certificado
- ✓ Gate por idade via consentimento LGPD, não custódia financeira
- ✓ Sem verificação por foto/biometria
- ✓ Planos por dias de aula na semana (3/5/7), 2h/dia, sem acumular
- ✓ Foco Brasil (LGPD + idioma da experiência)
- ✓ Certificado é só mensal
- ✓ Hábito diário (cenários reais + lembrete) — Fase 1
- ✓ Peso do certificado (portfólio + prospecção de parceria com escolas) — Fase 1
- ✓ Cultura e sotaque (cápsulas + sotaque regional) — Fase 1
- ✓ Resumo semanal automático ao responsável — Fase 1

**Em aberto:**
- ○ Regra concreta de dificuldade adaptativa e correção que explica o porquê (seção
  11) — ainda é intenção, não critério testável
- ○ Preço do plano Avançado — recalcular com custo real de computação
- ○ Métrica de sucesso do piloto da Fase 0 — que número/comparação/prazo prova que
  o certificado sozinho sustenta o hábito

## 10 · Decisões da rodada de 17 ago

Quatro frentes que estavam em aberto viraram escopo do MVP (Fase 1), sem esperar a
Fase 2 ou 3:

**Hábito diário**
- Aulas em cenários reais (aeroporto, entrevista de emprego, restaurante), não só
  gramática solta
- Lembrete no horário exato do dia de aula do aluno

**Peso do certificado**
- Portfólio de idiomas exportável (PDF único com todos os certificados do aluno)
- Parceria com escolas para o certificado valer nota extra/crédito extracurricular —
  a prospecção começa já; fechar depende de terceiros

**Contexto cultural e sotaque**
- Cápsulas curtas de cultura por idioma (música, gírias, comida típica)
- Sotaque regional escolhível dentro do idioma, aceitando o custo extra de voz desde
  o início
- Prioridade de gancho cultural para o Mandarim vale para quando ele entrar — não
  muda a ordem de demanda que decide o 2º idioma na Fase 3

**Família sem dinheiro no meio**
- Resumo semanal de progresso enviado automaticamente ao responsável, sem
  reintroduzir nenhum mecanismo financeiro

## 11 · Pedagogia e foco

O certificado reconhece que o aluno apareceu — não garante, sozinho, que ele
aprendeu. Três frentes resolvem isso, sem depender de recompensa:

**Pedagogia real**
- Repetição espaçada (o que o aluno errou/aprendeu recente volta antes de esquecer)
- Produção antes de reconhecimento ("fale isso em espanhol", não múltipla escolha)
- Correção que explica o porquê ("você trocou o gênero do artigo")
- Dificuldade adaptativa dentro da própria aula

**Estrutura da aula de 2h**
- Blocos de ~20–25 min com propósito diferente (aquecimento, prática guiada,
  conversa livre, revisão)
- Pausa curta entre blocos
- Barra de progresso por blocos, não por minutos restantes

**Motivação por significado**
- Objetivo pessoal no cadastro muda os temas de conversa do tutor
- Marcos de capacidade real ("primeira conversa de 5 min sem tradução")
- Diário semanal curto no idioma, lido e respondido pelo tutor
- Mapa do mês visível (semana 1 ✓, semana 2 ✓...)

> **Maior retorno da lista:** dificuldade adaptativa + correção que explica o
> porquê. É o que decide se o aluno sai falando melhor de verdade ou só acumulou
> tela — e o que protege a credibilidade do certificado no fim do mês.

---

*Baseado na análise das 34 imagens e do vídeo em `Documentos/app bilingue ai` e do
site getlucida.com. Preços e nomes de plano são ilustrativos.*
