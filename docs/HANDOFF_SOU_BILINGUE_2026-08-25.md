# Sou Bilíngue — passagem para continuidade

Data: 25/08/2026  
Projeto correto: `C:\Users\Willian fraga\Documents\Sou Bilingue\soubilingue`  
Produção: `https://app.soubilingue.com.br`  
Branch de implantação: `codex/sou-bilingue-deploy`

## Estado entregue

O aplicativo está online no Coolify. A área do aluno utiliza novamente o avatar fotográfico anterior da Clara. A experiência experimental de videochamada Tavus foi desativada após o teste do responsável pelo produto.

Estado visual confirmado em produção:

- avatar anterior restaurado;
- botão “Videochamada realista” não aparece;
- movimentos artificiais de inclinação e ampliação estão desativados;
- chat, Claude, ElevenLabs, microfone e transcrição anteriores permanecem disponíveis;
- seletor de idioma e seletor de tutor continuam na página da aula.

## Trabalho realizado nesta sessão

### Protótipo visual da Clara

Foram produzidas quatro poses consistentes da tutora:

- `public/tutores/clara-wave.png`;
- `public/tutores/clara-thumbs-up.png`;
- `public/tutores/clara-celebrate.png`;
- `public/tutores/clara-blink.png`.

O primeiro protótipo utilizava troca de poses e animações CSS. O resultado foi considerado artificial. Os movimentos contínuos foram retirados e a foto principal voltou a ficar estável.

### Pesquisa e teste Tavus

Foi criada uma conta Tavus e uma PAL/Persona chamada Clara, com:

- aparência stock “Gloria — Warm”;
- português como idioma inicial;
- inglês, espanhol, francês, italiano e chinês habilitados;
- personalidade acolhedora, alegre e não autoritária;
- correções gentis e sugestões quando o aluno trava;
- guardrails contra ridicularização, autoritarismo, lições forçadas, dados inventados e certificações falsas.

A integração técnica foi criada nos arquivos:

- `src/app/api/aula/tavus/route.ts`;
- `src/components/aluno/TavusAula.tsx`;
- `src/components/aluno/AulaChatComHoras.tsx`;
- `src/app/aluno/aula/page.tsx`.

As credenciais foram armazenadas somente no Coolify. Nenhuma chave foi gravada no Git ou na documentação.

### Resultado do teste Tavus

O vídeo realista abriu corretamente, mas a primeira configuração apresentou problemas:

- não recebeu o idioma selecionado no perfil;
- iniciou respostas em inglês;
- não acompanhou corretamente a troca para espanhol;
- utilizou a interface padrão Daily/Tavus, visualmente diferente do aplicativo;
- pediu novamente o nome do participante.

Foi identificada a correção técnica necessária: criar cada conversa com `properties.language`, `conversational_context` e `custom_greeting`, incluindo nome, idioma, nível e objetivo do aluno. Essa correção não foi aplicada porque o responsável solicitou a reversão do Tavus.

### Proteção de custos

O endpoint Tavus possui encerramento explícito de conversa e timeouts contra sessões órfãs. Mesmo assim, a funcionalidade está bloqueada por feature flag:

`TAVUS_ENABLED=true`

Como essa variável não está habilitada, o Tavus permanece desligado e não pode ser iniciado pela interface ou pelo endpoint.

## Validações executadas

- `npm run typecheck`: aprovado;
- `npm run build`: aprovado durante a implementação Tavus;
- criação real de conversa Tavus: aprovada;
- carregamento do vídeo WebRTC: aprovado;
- publicação Coolify: aprovada;
- verificação final em produção: avatar anterior presente e Tavus ausente.

## Commits importantes

- `4620d9f` — adiciona expressões animadas da tutora Clara;
- `886c535` — prepara videochamada realista com Tavus e remove movimento contínuo;
- `b47e647` — adiciona encerramento seguro das sessões Tavus;
- `fa2d129` — desativa Tavus e restaura a experiência anterior.

## Decisões preservadas

1. Não recomeçar o projeto.
2. Não tocar no projeto Academia Flow.
3. Manter o domínio `app.soubilingue.com.br` apontado para o Sou Bilíngue.
4. Manter Tavus desativado até nova decisão explícita.
5. Não usar animação CSS para inclinar ou ampliar o retrato inteiro.
6. Não expor chaves Tavus, Claude, ElevenLabs, Supabase ou Asaas no navegador ou no Git.
7. Preservar a aula anterior como modo principal.

## Ponto recomendado para amanhã

Prioridade 1: testar completamente a aula anterior restaurada:

1. escolher espanhol;
2. iniciar conversa;
3. confirmar saudação em português;
4. falar em português;
5. confirmar transcrição;
6. verificar transição gradual para espanhol;
7. confirmar que o microfone reabre automaticamente;
8. verificar encerramento da sessão e consumo de horas.

Prioridade 2: corrigir qualquer problema de voz, STT ou troca de idioma no modo anterior antes de voltar a experimentar outro avatar.

Prioridade 3, somente se aprovada: reavaliar Tavus usando contexto por sessão e interface própria com Daily SDK. Não reativar apenas definindo a flag sem antes corrigir idioma, nome, nível, objetivo e encerramento.

## Acessos operacionais

- Aplicativo: `https://app.soubilingue.com.br/aluno/aula`
- Coolify: aplicação `sou-bilingue`, ambiente `production`
- Supabase: projeto exclusivo do Sou Bilíngue
- GitHub: repositório `Willianfraga/Sou-Bilingue`
- Tavus: conta criada e configuração mantida inativa

Nenhuma senha ou chave secreta está registrada neste documento.
