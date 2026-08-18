// Cria contas de teste no Supabase Auth + profiles/alunos/consentimentos_lgpd.
// Só existe porque o cadastro público (§ 12, funil QR → venda → checkout)
// continua adiado — sem isso não tem como testar login de verdade.
//
// Rodar (a partir da raiz do projeto, com as variáveis de .env.local carregadas):
//   export $(grep -v '^#' .env.local | xargs -d '\n') && node scripts/seed-usuarios-teste.mjs
//
// Senha de teste igual pra todas as contas — está em texto puro aqui de
// propósito porque não existe usuário real nenhum ainda. Trocar/remover
// este script antes de qualquer divulgação real (§ 08 Fase 1).

import { createClient } from "@supabase/supabase-js";

const SENHA_TESTE = "Teste@123";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function criarUsuario(email, nome, papel) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SENHA_TESTE,
    email_confirm: true, // pula confirmação por e-mail — sem SMTP configurado ainda
  });
  if (error) throw new Error(`Falha ao criar auth user ${email}: ${error.message}`);

  const userId = data.user.id;

  const { error: erroProfile } = await supabase
    .from("profiles")
    .insert({ id: userId, papel, nome });
  if (erroProfile) {
    throw new Error(`Falha ao criar profile ${email}: ${erroProfile.message}`);
  }

  console.log(`✓ ${papel}: ${email} (id ${userId})`);
  return userId;
}

async function main() {
  // 1. Admin
  await criarUsuario("admin@soubilingue.com.br", "Admin SouBilingue", "admin");

  // 2. Aluno maior de idade, autossuficiente (§ 02)
  const alunoAdultoId = await criarUsuario(
    "aluno.adulto@soubilingue.com.br",
    "Lucas Melo",
    "aluno",
  );

  const { data: clara } = await supabase
    .from("tutores")
    .select("id")
    .eq("nome", "Clara")
    .single();

  const { error: erroAlunoAdulto } = await supabase.from("alunos").insert({
    id: alunoAdultoId,
    responsavel_id: null,
    maior_de_idade: true,
    idioma: "espanhol",
    sotaque: "Argentina",
    plano: "intermediario",
    tutor_id: clara.id,
    objetivo_pessoal: "Viagem — quer se virar sozinho numa viagem pra Buenos Aires",
  });
  if (erroAlunoAdulto) throw new Error(erroAlunoAdulto.message);
  console.log("  linha em alunos criada (maior de idade)");

  // 3. Responsável + aluno menor de idade vinculado (§ 02: consentimento LGPD)
  const responsavelId = await criarUsuario(
    "responsavel@soubilingue.com.br",
    "Marina Fraga",
    "responsavel",
  );

  const alunoMenorId = await criarUsuario(
    "aluno.menor@soubilingue.com.br",
    "Pedro Fraga",
    "aluno",
  );

  const { error: erroAlunoMenor } = await supabase.from("alunos").insert({
    id: alunoMenorId,
    responsavel_id: responsavelId,
    maior_de_idade: false,
    idioma: "espanhol",
    sotaque: "México",
    plano: "basico",
    tutor_id: clara.id,
    objetivo_pessoal: "Escola — quer acompanhar melhor as aulas de espanhol",
  });
  if (erroAlunoMenor) throw new Error(erroAlunoMenor.message);
  console.log("  linha em alunos criada (menor, vinculado ao responsável)");

  const { error: erroConsentimento } = await supabase
    .from("consentimentos_lgpd")
    .insert({ aluno_id: alunoMenorId, responsavel_id: responsavelId });
  if (erroConsentimento) throw new Error(erroConsentimento.message);
  console.log("  consentimento LGPD registrado");

  console.log(`\nSenha de todas as contas de teste: ${SENHA_TESTE}`);
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
