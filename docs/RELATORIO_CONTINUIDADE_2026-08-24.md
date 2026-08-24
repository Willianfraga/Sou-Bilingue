# Sou Bilíngue — Relatório de continuidade

Atualizado em: 24 de agosto de 2026  
Ambiente publicado: `https://app.soubilingue.com.br`  
Branch de publicação: `codex/sou-bilingue-deploy`

## 1. Princípio adotado

O projeto existente foi preservado e continuado. Nenhum projeto novo foi criado e nenhum arquivo da Academia Flow foi usado como base do aplicativo. Todo o trabalho descrito aqui pertence ao repositório e à infraestrutura do **Sou Bilíngue**.

## 2. Interface do aluno

- Barra lateral recebeu identidade visual roxa/azul e textos brancos em negrito.
- Menus do aluno restaurados e organizados:
  - Iniciar aula;
  - Escolher meu tutor;
  - Meu progresso;
  - Meu perfil;
  - Escolher meu idioma;
  - Meus certificados;
  - Minhas lições.
- Tela de lições permite conversa livre e acesso opcional às lições sugeridas.
- Seleção de idioma e tutor foi incorporada à experiência do aluno.
- Botões foram padronizados no estilo premium branco/roxo solicitado.
- Tela de login foi simplificada:
  - removidos símbolo `SB`, nome superior e “Já sou aluno”;
  - mantidos “Faça seu login” e “Seu melhor professor está aqui”;
  - fundo e foco dos campos alinhados à paleta roxa/azul da área de aula.

## 3. Tutores e aula conversacional

- Tutor aparece em destaque no topo, simulando videochamada.
- Mensagens do tutor e aluno possuem estilos distintos.
- Respostas do tutor oferecem repetição de áudio.
- A conversa funciona em ciclo automático:
  1. tutor responde;
  2. ElevenLabs gera a voz;
  3. ao terminar a fala, o microfone abre automaticamente;
  4. o aplicativo detecta fala e silêncio;
  5. o áudio é enviado para transcrição;
  6. o texto é enviado ao Claude;
  7. o tutor responde e o ciclo recomeça.
- Há fallback para voz e reconhecimento nativos do navegador quando necessário.
- O aluno pode alternar entre português e o idioma estudado; a transcrição usa detecção automática.

## 4. Inteligência artificial e pedagogia

- Modelo padrão: Claude Haiku 4.5, configurável por variável de ambiente.
- A conversa começa em português brasileiro.
- O tutor cumprimenta o aluno pelo primeiro nome e pergunta o objetivo da aula.
- A imersão no idioma-alvo acontece gradualmente.
- O tutor acompanha o idioma usado pelo aluno, corrige com gentileza e mantém diálogo natural.
- O prompt orienta o tutor a não ridicularizar erros e a fazer uma pergunta pessoal por vez.

## 5. Memória persistente

Migration aplicada: `0008_student_memories.sql`.

O tutor registra fatos estáveis compartilhados pelo aluno, como:

- cidade onde mora;
- cidade de origem;
- idade;
- profissão;
- interesses;
- objetivo de aprendizagem.

As memórias relevantes são recuperadas em aulas futuras. O conteúdo é protegido por RLS e vinculado ao aluno autenticado.

## 6. ElevenLabs

- TTS: `eleven_flash_v2_5`.
- STT: `scribe_v2`.
- As chaves ficam somente no servidor.
- A chave configurada possui permissões mínimas de voz, transcrição e leitura de vozes.
- O áudio da conversa não é guardado pela telemetria do aplicativo.
- Clara recebeu um perfil próprio de expressividade: voz Laura, estabilidade
  reduzida, estilo elevado e ritmo ligeiramente mais ágil.
- A personalidade da Clara passou a usar calor humano, entusiasmo brasileiro e
  hospitalidade inspirada no Nordeste, sem caricatura ou estereótipos.
- Todos os tutores receberam perfis próprios de expressividade vocal e regras
  para acompanhar a energia e a linguagem do aluno.
- Os tutores passaram a sugerir temas, respostas, exemplos, situações reais e
  pequenos desafios de modo opcional, alegre e descontraído.

## 7. Painel administrativo de custos de IA

Migration aplicada: `0009_ai_usage_metrics.sql`.

O painel passou a registrar e apresentar:

- tokens de entrada e saída do Claude;
- tokens de cache;
- caracteres sintetizados pelo ElevenLabs;
- segundos/minutos transcritos;
- número de chamadas por serviço;
- custo estimado em dólar;
- conversão estimada em reais;
- filtros de 7, 30 e 90 dias;
- gráfico diário de custo;
- gráfico de participação por serviço;
- estados vazios quando ainda não há dados.

A tabela `ai_usage_events` armazena somente unidades faturáveis e estimativas. Não armazena mensagens, áudio, chaves ou senhas.

Preços iniciais usados na estimativa:

- Claude Haiku: valores conservadores por milhão de tokens;
- ElevenLabs Flash: custo por mil caracteres;
- ElevenLabs Scribe v2: custo por hora de áudio.

A fatura de cada provedor permanece sendo a fonte financeira definitiva.

## 8. Asaas Sandbox

Conexão validada com resposta HTTP 200 no endpoint oficial do Sandbox.

Correções realizadas:

- compatibilidade automática com o domínio atual `api-sandbox.asaas.com`;
- assinatura nasce como `pendente`, nunca ativa antes do pagamento;
- primeira cobrança é gerada com vencimento no dia do checkout;
- aluno é direcionado para a `invoiceUrl` oficial retornada pelo Asaas;
- seleção do meio de pagamento fica disponível na fatura do Asaas;
- e-mail do aluno vem da sessão autenticada, sem uso incorreto do cliente admin;
- clientes e cobranças recebem `externalReference` iniciado por `soubilingue:`;
- descrições financeiras identificam claramente “Sou Bilíngue”;
- webhook ativa o plano somente em `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`;
- eventos recebidos são registrados e protegidos contra duplicidade.

## 9. Recargas de horas

Foi corrigido um problema importante: a recarga estava sendo criada como assinatura mensal. Agora ela é uma cobrança avulsa.

Fluxo atual:

1. aluno seleciona o pacote;
2. aplicativo cria uma recarga pendente;
3. Asaas cria uma cobrança avulsa;
4. aluno abre a fatura oficial;
5. webhook confirma o pagamento;
6. função idempotente credita as horas;
7. tentativas repetidas não duplicam o saldo.

Migration aplicada: `0010_hardening_topup_processing.sql`.

## 10. Segurança

- Nenhuma chave foi incluída neste documento ou no Git.
- Variáveis secretas permanecem em `.env.local` e no Coolify.
- Webhook exige token próprio.
- Comparação do token utiliza tempo constante.
- Webhooks possuem registro idempotente.
- Crédito de recarga possui trava adicional dentro do banco.
- Assinaturas não são liberadas pelo redirecionamento do navegador.
- A confirmação financeira vem do webhook do Asaas.
- RLS permanece habilitado nas tabelas sensíveis.

## 11. Validações realizadas

- `npm run typecheck`: concluído sem erros.
- `npm run build`: concluído com sucesso, 31 rotas.
- Build no Coolify: concluído.
- Rolling update no Coolify: concluído.
- Supabase migrations 0008, 0009 e 0010: aplicadas com sucesso.
- Asaas Sandbox: credencial e endpoint responderam HTTP 200.

Commits principais desta etapa:

- `3d8e187` — conversa adaptativa e memória do aluno;
- `73d4e17` — painel premium de custos de IA;
- `cac40ce` — login alinhado à identidade roxa;
- `b4bf70a` — checkout e recargas corrigidos no Sandbox Asaas.

## 12. Estado atual

O código e a infraestrutura estão preparados para iniciar a **homologação funcional no Sandbox**. Isso não significa que pagamentos reais estejam liberados. Antes da produção financeira, os casos abaixo precisam ser executados e registrados.

## 13. Checklist obrigatório de homologação

- [ ] Criar uma assinatura Sandbox pelo aplicativo.
- [ ] Confirmar abertura da fatura oficial do Asaas.
- [ ] Simular pagamento Pix aprovado.
- [ ] Confirmar recebimento do webhook.
- [ ] Confirmar mudança de assinatura de `pendente` para `ativa`.
- [ ] Confirmar liberação correta das horas do plano.
- [ ] Testar cartão aprovado e recusado.
- [ ] Testar cobrança vencida/removida.
- [ ] Testar renovação do ciclo mensal.
- [ ] Testar cancelamento da assinatura.
- [ ] Comprar recarga Sandbox.
- [ ] Confirmar que a recarga credita horas uma única vez.
- [ ] Reenviar o mesmo evento e comprovar idempotência.
- [ ] Conferir pagamentos e custos no painel administrativo.
- [ ] Testar fluxo em celular e desktop.

## 14. Passagem para produção

O Sandbox não é migrado automaticamente. Código e banco permanecem, mas clientes, cobranças, IDs e chaves são próprios de cada ambiente.

Procedimento de produção:

1. concluir integralmente o checklist Sandbox;
2. criar uma chave de produção exclusiva para o Sou Bilíngue;
3. configurar webhook de produção exclusivo;
4. trocar `ASAAS_API_URL`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` no Coolify;
5. manter identificação `soubilingue:` em todos os registros;
6. executar uma cobrança real de valor mínimo;
7. confirmar pagamento, webhook, ativação e conciliação;
8. liberar gradualmente para usuários reais.

É possível usar a mesma conta Asaas da Academia Flow quando os dois produtos pertencem à mesma entidade, mas o Sou Bilíngue deve utilizar chave, webhook, descrições e referências externas próprios para evitar mistura operacional.

## 15. Próxima ação

Executar a homologação end-to-end da primeira assinatura Sandbox usando uma conta de aluno sem assinatura ativa. Somente após todos os eventos serem verificados no Supabase e no Asaas o módulo financeiro poderá ser classificado como pronto para produção.
