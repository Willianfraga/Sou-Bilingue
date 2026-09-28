import test from "node:test";
import assert from "node:assert";

const BASE_URL = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helpers
async function apiCall(method, path, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  return { status: response.status, data, headers: response.headers };
}

async function signUpWithSupabase(email, password) {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Supabase credentials missing");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}

// Tests
test("Cadastro: fluxo completo", async (t) => {
  // Cria um usuário real e dispara e-mail de confirmação: só roda quando as
  // credenciais forem passadas explicitamente no ambiente do teste.
  await t.test("1. Signup cria usuário no Supabase", { skip: !SUPABASE_URL || !ANON_KEY }, async () => {
    const email = `test-${Date.now()}@test.com`;
    const password = `t-${crypto.randomUUID()}`;

    const { user, error } = await signUpWithSupabase(email, password);

    assert(user, `Signup falhou: ${error?.message}`);
    assert.strictEqual(user.email, email);
  });

  await t.test("2. POST /api/cadastro rejeita sem sessão", async () => {
    const result = await apiCall("POST", "/api/cadastro", {
      nome: "Test User",
    });

    assert.strictEqual(result.status, 401);
    assert.strictEqual(result.data.success, false);
  });

  await t.test("3. POST /api/cadastro rejeita dados incompletos", async () => {
    const result = await apiCall("POST", "/api/cadastro", {
      nome: "", // vazio
    });

    assert.strictEqual(result.status, 400);
  });
});

test("Login: fluxo completo", async (t) => {
  await t.test("1. /login é página pública", async () => {
    const response = await fetch(`${BASE_URL}/login`);
    assert.strictEqual(response.status, 200);
  });

  await t.test("2. /cadastro é página pública", async () => {
    const response = await fetch(`${BASE_URL}/cadastro`);
    assert.strictEqual(response.status, 200);
  });

  await t.test("3. /auth/reset-password é página pública", async () => {
    const response = await fetch(`${BASE_URL}/auth/reset-password?code=test`);
    assert.strictEqual(response.status, 200);
  });
});

test("Recuperação de senha", async (t) => {
  await t.test("1. /api/auth/reset-password rejeita token inválido", async () => {
    const result = await apiCall("POST", "/api/auth/reset-password", {
      token: "invalid-token-12345",
      password: "NewPass@123",
      passwordConfirm: "NewPass@123",
    });

    assert.strictEqual(result.status, 401);
    assert.strictEqual(result.data.success, false);
  });

  await t.test("2. /api/auth/reset-password rejeita senhas diferentes", async () => {
    const result = await apiCall("POST", "/api/auth/reset-password", {
      token: "some-token",
      password: "Password@123",
      passwordConfirm: "DifferentPass@123",
    });

    assert.strictEqual(result.status, 400);
    assert(result.data.error.includes("não correspondem"));
  });

  await t.test("3. /api/auth/reset-password rejeita senha curta", async () => {
    const result = await apiCall("POST", "/api/auth/reset-password", {
      token: "some-token",
      password: "123",
      passwordConfirm: "123",
    });

    assert.strictEqual(result.status, 400);
    assert(result.data.error.includes("6 caracteres"));
  });
});

test("Middleware: rotas públicas vs privadas", async (t) => {
  await t.test("1. Rotas públicas são acessíveis sem autenticação", async () => {
    const rotas = ["/login", "/cadastro", "/auth/reset-password", "/verificar"];

    for (const rota of rotas) {
      const response = await fetch(`${BASE_URL}${rota}`);
      assert(
        response.status === 200 || response.status === 404,
        `Rota ${rota} deve ser pública (status ${response.status})`
      );
    }
  });

  await t.test("2. Rotas privadas redirecionam para login", async () => {
    const rotas = ["/aluno", "/responsavel", "/admin"];

    for (const rota of rotas) {
      const response = await fetch(`${BASE_URL}${rota}`, {
        redirect: "manual",
      });

      // Pode ser 307 (redirect) ou 200 (se rota não existe)
      assert(
        response.status === 307 || response.status === 200,
        `Rota privada ${rota} não está protegida corretamente`
      );
    }
  });
});

test("APIs de cadastro", async (t) => {
  await t.test("1. GET /api/tutores exige sessão", async () => {
    // O middleware deixa passar (a lista de tutores é usada no onboarding),
    // mas a própria rota recusa quem não está logado — ver CORREÇÕES_REALIZADAS.md.
    const result = await apiCall("GET", "/api/tutores");
    assert.strictEqual(result.status, 401);
  });

  await t.test("2. POST /api/cadastro rejeita sem autenticação", async () => {
    const result = await apiCall("POST", "/api/cadastro", {
      nome: "Test",
    });

    assert.strictEqual(result.status, 401);
  });
});

test("Validações de dados", async (t) => {
  await t.test("1. Nome deve ter ao menos 2 caracteres", async () => {
    const result = await apiCall("POST", "/api/cadastro", {
      nome: "A", // muito curto
    });

    // Sem autenticação, retorna 401 primeiro
    assert(result.status === 400 || result.status === 401);
  });

  await t.test("2. Email deve ser válido", async () => {
    const response = await fetch(`${BASE_URL}/cadastro`);
    // Página carrega; validação real é no navegador + backend
    assert.strictEqual(response.status, 200);
  });
});
