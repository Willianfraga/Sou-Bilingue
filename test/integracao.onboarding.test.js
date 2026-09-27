// Integração com o banco real (Supabase do .env.local): persistência do
// rascunho, conclusão sem duplicar e isolamento entre alunos pelo RLS.
// Cria dois alunos descartáveis e apaga no fim. Sem credenciais, pula.
//   npm run test:integracao
const test = require("node:test");
const assert = require("node:assert/strict");
const { ENV, configurado, criarAlunoTemporario, removerAluno, clienteLogado } = require("./suporte/alunos-temporarios");
const { createClient } = require("@supabase/supabase-js");

const pular = configurado ? false : "defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY";

test("onboarding no banco: persistência e isolamento por aluno", { skip: pular }, async (t) => {
  const alunoA = await criarAlunoTemporario("a");
  const alunoB = await criarAlunoTemporario("b");
  t.after(async () => {
    await removerAluno(alunoA);
    await removerAluno(alunoB);
  });
  const a = await clienteLogado(alunoA);
  const b = await clienteLogado(alunoB);

  await t.test("rascunho é salvo e recuperado", async () => {
    const { error } = await a.from("aluno_onboarding").upsert(
      { aluno_id: alunoA.id, rascunho: { nomePreferido: "Aninha" }, etapa_atual: 3 },
      { onConflict: "aluno_id" },
    );
    assert.equal(error, null);
    const { data } = await a.from("aluno_onboarding").select("rascunho, etapa_atual, concluido_em").eq("aluno_id", alunoA.id).single();
    assert.deepEqual(data.rascunho, { nomePreferido: "Aninha" });
    assert.equal(data.etapa_atual, 3);
    assert.equal(data.concluido_em, null);
  });

  await t.test("atualizar não cria registro duplicado", async () => {
    await a.from("aluno_onboarding").upsert(
      { aluno_id: alunoA.id, rascunho: { nomePreferido: "Ana" }, etapa_atual: 5 },
      { onConflict: "aluno_id" },
    );
    const { data } = await a.from("aluno_onboarding").select("etapa_atual").eq("aluno_id", alunoA.id);
    assert.equal(data.length, 1);
    assert.equal(data[0].etapa_atual, 5);
  });

  await t.test("conclusão grava respostas, versão e data", async () => {
    const agora = new Date().toISOString();
    const { error } = await a.from("aluno_onboarding").upsert(
      { aluno_id: alunoA.id, respostas: { nomePreferido: "Ana" }, rascunho: {}, versao_questionario: 1, concluido_em: agora },
      { onConflict: "aluno_id" },
    );
    assert.equal(error, null);
    const { data } = await a.from("aluno_onboarding").select("respostas, concluido_em, versao_questionario").eq("aluno_id", alunoA.id).single();
    assert.deepEqual(data.respostas, { nomePreferido: "Ana" });
    assert.ok(data.concluido_em);
    assert.equal(data.versao_questionario, 1);
  });

  await t.test("outro aluno não lê as respostas", async () => {
    const { data } = await b.from("aluno_onboarding").select("respostas").eq("aluno_id", alunoA.id);
    assert.deepEqual(data, []);
  });

  await t.test("outro aluno não cria nem altera a linha alheia", async () => {
    const insercao = await b.from("aluno_onboarding").upsert(
      { aluno_id: alunoA.id, respostas: { nomePreferido: "Invasor" } },
      { onConflict: "aluno_id" },
    );
    assert.ok(insercao.error, "RLS deveria recusar");

    await b.from("aluno_onboarding").update({ respostas: { nomePreferido: "Invasor" } }).eq("aluno_id", alunoA.id);
    const { data } = await a.from("aluno_onboarding").select("respostas").eq("aluno_id", alunoA.id).single();
    assert.deepEqual(data.respostas, { nomePreferido: "Ana" });
  });

  await t.test("sem sessão não lê nada", async () => {
    const anonimo = createClient(ENV.url, ENV.anon, { auth: { persistSession: false } });
    const { data } = await anonimo.from("aluno_onboarding").select("aluno_id");
    assert.deepEqual(data ?? [], []);
  });
});
