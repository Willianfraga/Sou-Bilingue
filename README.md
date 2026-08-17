# SouBilingue

App de aprendizado de idiomas por conversa com IA. Em vez de recompensa em dinheiro,
o aluno que cumprir a cota de aulas de todas as semanas do mês recebe automaticamente
um **certificado de conclusão mensal**, verificável publicamente.

> **Status:** Fase 0 do roteiro (piloto manual) — nenhuma tela de produto em uso
> ainda. Este é o scaffold inicial de código, criado em paralelo à documentação.
> Veja `docs/ESCOPO.md` para o blueprint completo e `CLAUDE.md` para o resumo de
> decisões e pendências.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

## Estrutura

```
docs/ESCOPO.md   blueprint completo do produto (referências, planos, motor de
                 certificação, arquitetura, roteiro por fases, decisões e pendências)
src/app/         Next.js App Router
CLAUDE.md        contexto do projeto para o Claude Code — leia antes de mexer no escopo
```

## Referências

As 34 imagens e o vídeo do app de referência (Lucida) analisados para montar este
escopo estão na pasta acima: `../` (Documents/app bilingue ai).
