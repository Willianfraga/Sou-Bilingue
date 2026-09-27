// Apoio aos testes de integração: cria alunos descartáveis direto no Supabase
// (service role, só no processo de teste), faz login como eles e apaga tudo
// no fim. Nada daqui roda no app.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { createServerClient } = require("@supabase/ssr");

function carregarEnv() {
  const arquivo = path.join(__dirname, "..", "..", ".env.local");
  const env = { ...process.env };
  if (fs.existsSync(arquivo)) {
    for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: env.SUPABASE_SERVICE_ROLE_KEY,
    baseUrl: env.TEST_BASE_URL || "http://localhost:3000",
  };
}

const ENV = carregarEnv();
const configurado = Boolean(ENV.url && ENV.anon && ENV.service);
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

function admin() {
  return createClient(ENV.url, ENV.service, opcoes);
}

async function criarAlunoTemporario(rotulo) {
  const adm = admin();
  const email = `teste.onboarding.${Date.now()}.${rotulo}@soubilingue.test`;
  const senha = crypto.randomBytes(18).toString("base64url");

  const { data: criado, error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  const id = criado.user.id;

  const { data: tutor } = await adm.from("tutores").select("id").limit(1).single();
  const r1 = await adm.from("profiles").insert({ id, papel: "aluno", nome: `Teste ${rotulo}` });
  if (r1.error) throw new Error(`profiles: ${r1.error.message}`);
  const r2 = await adm.from("alunos").insert({
    id,
    responsavel_id: null,
    maior_de_idade: true,
    idioma: "ingles",
    sotaque: "Americano",
    plano: "basico",
    tutor_id: tutor.id,
    objetivo_pessoal: "teste automatizado",
  });
  if (r2.error) throw new Error(`alunos: ${r2.error.message}`);

  return { id, email, senha };
}

async function removerAluno(aluno) {
  if (aluno?.id) await admin().auth.admin.deleteUser(aluno.id); // cascata: profiles → alunos → aluno_onboarding
}

// Cliente com a sessão do aluno (RLS ativo), como o app usa.
async function clienteLogado(aluno) {
  const cliente = createClient(ENV.url, ENV.anon, opcoes);
  const { error } = await cliente.auth.signInWithPassword({ email: aluno.email, password: aluno.senha });
  if (error) throw new Error(`login: ${error.message}`);
  return cliente;
}

// Cookies de sessão no formato do @supabase/ssr, para chamar o app via HTTP.
async function cookiesDeSessao(aluno) {
  const jar = new Map();
  const cliente = createServerClient(ENV.url, ENV.anon, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (lista) => lista.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await cliente.auth.signInWithPassword({ email: aluno.email, password: aluno.senha });
  if (error) throw new Error(`login: ${error.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

async function servidorNoAr() {
  try {
    const r = await fetch(`${ENV.baseUrl}/login`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    return r.status < 500;
  } catch {
    return false;
  }
}

module.exports = { ENV, configurado, admin, criarAlunoTemporario, removerAluno, clienteLogado, cookiesDeSessao, servidorNoAr };
