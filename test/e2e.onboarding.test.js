// Fluxo real pelo servidor (npm run dev em outra aba): aluno novo cai na
// entrevista, rascunho sobrevive ao "refresh", conclusão libera as aulas e a
// entrevista não reaparece. Usa um aluno descartável, apagado no fim.
//   npm run test:e2e
const test = require("node:test");
const assert = require("node:assert/strict");
const { ENV, configurado, criarAlunoTemporario, removerAluno, cookiesDeSessao, servidorNoAr } = require("./suporte/alunos-temporarios");

const RESPOSTAS = {
  nomePreferido: "Rafa",
  faixaEtaria: "18_24",
  idiomaAlvo: "ingles",
  nivel: "basico",
  objetivos: ["viajar"],
  temasConversa: ["games"],
  situacoesUso: ["viagens"],
  habilidadesPrioritarias: ["conversacao"],
  estiloAprendizagem: ["jogos"],
  preferenciaCorrecao: "so_importantes",
  disponibilidadeEstudo: "15_30",
  temasEvitados: "futebol",
};

test("onboarding pelo servidor", async (t) => {
  if (!configurado) return t.skip("sem credenciais do Supabase no .env.local");
  if (!(await servidorNoAr())) return t.skip(`servidor fora do ar em ${ENV.baseUrl}`);

  const aluno = await criarAlunoTemporario("e2e");
  t.after(() => removerAluno(aluno));
  const cookie = await cookiesDeSessao(aluno);
  const chamar = (rota, init = {}) =>
    fetch(`${ENV.baseUrl}${rota}`, {
      redirect: "manual",
      ...init,
      headers: { cookie, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });

  await t.test("aluno com onboarding pendente é redirecionado para /boas-vindas", async () => {
    for (const rota of ["/aluno", "/aluno/aula", "/aluno/perfil"]) {
      const r = await chamar(rota);
      assert.equal(r.status, 307, rota);
      assert.match(r.headers.get("location"), /\/boas-vindas$/, rota);
    }
    const pagina = await chamar("/boas-vindas");
    assert.equal(pagina.status, 200);
  });

  await t.test("aula com IA é recusada antes da entrevista", async () => {
    const r = await chamar("/api/aula/chat", {
      method: "POST",
      body: JSON.stringify({ mensagens: [{ role: "user", content: "oi" }] }),
    });
    assert.equal(r.status, 403);
  });

  await t.test("rascunho sobrevive a um novo carregamento da página", async () => {
    const r = await chamar("/api/onboarding", {
      method: "PUT",
      body: JSON.stringify({ rascunho: { nomePreferido: "Rafa Rascunho", nivel: "inexistente" }, etapa: 2 }),
    });
    assert.equal(r.status, 200);
    const estado = await (await chamar("/api/onboarding")).json();
    assert.equal(estado.rascunho.nomePreferido, "Rafa Rascunho");
    assert.equal(estado.rascunho.nivel, undefined, "opção inválida descartada pelo servidor");
    assert.equal(estado.etapa, 2);
    const html = await (await chamar("/boas-vindas")).text();
    assert.ok(html.includes("Rafa Rascunho"), "página recarregada retoma o rascunho");
  });

  await t.test("servidor valida os campos na conclusão", async () => {
    const r = await chamar("/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ respostas: { ...RESPOSTAS, nivel: "nativo", objetivos: [] } }),
    });
    assert.equal(r.status, 400);
    const corpo = await r.json();
    assert.ok(corpo.erros.nivel);
    assert.ok(corpo.erros.objetivos);
  });

  await t.test("conclusão salva e libera as aulas", async () => {
    const r = await chamar("/api/onboarding", { method: "POST", body: JSON.stringify({ respostas: RESPOSTAS }) });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).destino, "/aluno/aula");

    const estado = await (await chamar("/api/onboarding")).json();
    assert.equal(estado.concluido, true);
    assert.equal(estado.respostas.nomePreferido, "Rafa");
    assert.deepEqual(estado.rascunho, {});

    const aula = await chamar("/aluno/aula");
    assert.equal(aula.status, 200);
  });

  await t.test("sem plano ativo, as rotas de IA recusam com 402 (sem gerar custo)", async () => {
    const chat = await chamar("/api/aula/chat", {
      method: "POST",
      body: JSON.stringify({ mensagens: [{ role: "user", content: "oi" }] }),
    });
    assert.equal(chat.status, 402);
    assert.equal((await chat.json()).destino, "/checkout");
    const voz = await chamar("/api/aula/voz", { method: "POST", body: JSON.stringify({ texto: "oi" }) });
    assert.equal(voz.status, 402);
  });

  await t.test("entrevista concluída não reaparece, mas pode ser editada", async () => {
    const r = await chamar("/boas-vindas");
    assert.equal(r.status, 307);
    assert.match(r.headers.get("location"), /\/aluno\/aula$/);
    assert.equal((await chamar("/boas-vindas?modo=editar")).status, 200);
    assert.equal((await chamar("/boas-vindas?modo=refazer")).status, 200);
  });

  await t.test("edição atualiza as respostas sem perder a data de conclusão", async () => {
    const antes = await (await chamar("/api/onboarding")).json();
    const r = await chamar("/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ respostas: { ...RESPOSTAS, nomePreferido: "Rafael" } }),
    });
    assert.equal(r.status, 200);
    const depois = await (await chamar("/api/onboarding")).json();
    assert.equal(depois.respostas.nomePreferido, "Rafael");
    assert.ok(antes.concluidoEm);
    assert.equal(depois.concluidoEm, antes.concluidoEm);
  });

  await t.test("tela Lições usa os interesses da entrevista em vez de perguntar de novo", async () => {
    const html = await (await chamar("/aluno/licoes")).text();
    assert.equal(html.includes("O que você quer aprender hoje?"), false);
    assert.ok(html.includes(`/aluno/aula?tema=${encodeURIComponent("Games")}`));
    assert.ok(html.includes(">A2<"), "selo do nível 'básico'");
  });

  await t.test("perfil mostra as preferências e as opções de edição", async () => {
    const html = await (await chamar("/aluno/perfil")).text();
    assert.ok(html.includes("Preferências das aulas"));
    assert.ok(html.includes("Rafael"));
    assert.ok(html.includes("/boas-vindas?modo=editar"));
  });
});
