# Banco — SouBilingue

Projeto Supabase **separado** do "academia flow" (CLAUDE.md, decisão 15) — mesma
conta/stack, projetos diferentes. Nunca aplicar essa migration no projeto do
academia flow, nem vice-versa.

## Aplicar a migration

Assim que você tiver a URL e as chaves do projeto novo:

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

Ou cole o conteúdo de `migrations/0001_schema_inicial.sql` direto no SQL Editor
do painel do Supabase.

## O que ela cria

Espelha os tipos de `src/lib/types.ts` — ver comentário no topo do arquivo da
migration para o mapeamento tabela → seção do `docs/ESCOPO.md`. Resumo:

- **Identidade:** `profiles`, `alunos`, `tutores`, `consentimentos_lgpd`
- **Motor de certificação (§ 05):** `cotas_semanais`, `aulas`,
  `regras_certificacao`, `certificados`
- **Aquisição (§ 12):** `cupons`, `cadastros_origem`
- **Cobrança:** `assinaturas` (espelha o Asaas, não decide sozinha — mesma regra
  do academia flow)
- **Operação do criador:** `conteudo_por_nivel`, `parcerias_escolas`

RLS habilitado em toda tabela com dado de aluno/responsável, via
`app.pode_ver_aluno(aluno_id)` — aluno vê o próprio dado, responsável vê o do
aluno vinculado, admin vê tudo. **Só policies de leitura existem ainda** — toda
escrita hoje passa pelo cliente admin (service role); adicionar policies de
escrita quando as Server Actions de cadastro/checkout existirem.

## Próximo passo depois de aplicar

Trocar as funções `getXxxMock()` de `src/lib/mock/*.ts` por consultas reais —
o formato dos tipos já foi desenhado pra bater com essas tabelas, então a troca
é local, não estrutural.
