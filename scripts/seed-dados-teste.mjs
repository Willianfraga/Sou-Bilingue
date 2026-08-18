// Semeia cotas_semanais e certificados pros alunos de teste criados por
// seed-usuarios-teste.mjs — sem isso as telas de progresso/certificados
// ficariam vazias depois da troca de mock pra consulta real.
//
// Rodar depois de seed-usuarios-teste.mjs:
//   export $(grep -v '^#' .env.local | xargs -d '\n') && node scripts/seed-dados-teste.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function idPorEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`Usuário ${email} não encontrado — rode seed-usuarios-teste.mjs antes.`);
  return user.id;
}

async function main() {
  const alunoAdultoId = await idPorEmail("aluno.adulto@soubilingue.com.br");
  const alunoMenorId = await idPorEmail("aluno.menor@soubilingue.com.br");

  // Aluno adulto (intermediário, 5 dias/semana): mês em andamento — 2
  // semanas completas, 1 em andamento, 1 não começou. Mesmo padrão que
  // estava no mock antigo.
  const { error: erroCotasAdulto } = await supabase.from("cotas_semanais").insert([
    { aluno_id: alunoAdultoId, ano: 2026, mes: 8, semana_numero: 1, dias_necessarios: 5, dias_cumpridos: 5 },
    { aluno_id: alunoAdultoId, ano: 2026, mes: 8, semana_numero: 2, dias_necessarios: 5, dias_cumpridos: 5 },
    { aluno_id: alunoAdultoId, ano: 2026, mes: 8, semana_numero: 3, dias_necessarios: 5, dias_cumpridos: 3 },
    { aluno_id: alunoAdultoId, ano: 2026, mes: 8, semana_numero: 4, dias_necessarios: 5, dias_cumpridos: 0 },
  ]);
  if (erroCotasAdulto) throw new Error(erroCotasAdulto.message);
  console.log("✓ cotas_semanais: aluno adulto (mês em andamento)");

  // Aluno menor (básico, 3 dias/semana): mês perfeito até aqui — testa o
  // estado "elegível pro certificado" na tela.
  const { error: erroCotasMenor } = await supabase.from("cotas_semanais").insert([
    { aluno_id: alunoMenorId, ano: 2026, mes: 8, semana_numero: 1, dias_necessarios: 3, dias_cumpridos: 3 },
    { aluno_id: alunoMenorId, ano: 2026, mes: 8, semana_numero: 2, dias_necessarios: 3, dias_cumpridos: 3 },
    { aluno_id: alunoMenorId, ano: 2026, mes: 8, semana_numero: 3, dias_necessarios: 3, dias_cumpridos: 3 },
    { aluno_id: alunoMenorId, ano: 2026, mes: 8, semana_numero: 4, dias_necessarios: 3, dias_cumpridos: 3 },
  ]);
  if (erroCotasMenor) throw new Error(erroCotasMenor.message);
  console.log("✓ cotas_semanais: aluno menor (mês perfeito até aqui)");

  // Certificados só do aluno adulto — o menor ainda não tem nenhum (testa o
  // estado vazio "nenhum certificado ainda").
  const { error: erroCertificados } = await supabase.from("certificados").insert([
    {
      aluno_id: alunoAdultoId,
      mes_referencia: "2026-07-01",
      idioma: "espanhol",
      plano: "intermediario",
      codigo_verificacao: "SB-2026-07-K3F9Q",
    },
    {
      aluno_id: alunoAdultoId,
      mes_referencia: "2026-06-01",
      idioma: "espanhol",
      plano: "intermediario",
      codigo_verificacao: "SB-2026-06-M7X2L",
    },
  ]);
  if (erroCertificados) throw new Error(erroCertificados.message);
  console.log("✓ certificados: 2 certificados do aluno adulto");
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
