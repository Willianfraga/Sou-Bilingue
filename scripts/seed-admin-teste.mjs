// Semeia assinaturas, cupons, cadastros_origem e parcerias_escolas — dado
// que hoje só existia em src/lib/mock/admin.ts. Rodar depois de
// seed-usuarios-teste.mjs:
//   export $(grep -v '^#' .env.local | xargs -d '\n') && node scripts/seed-admin-teste.mjs

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
  if (!user) throw new Error(`Usuário ${email} não encontrado.`);
  return user.id;
}

async function main() {
  const alunoAdultoId = await idPorEmail("aluno.adulto@soubilingue.com.br");
  const alunoMenorId = await idPorEmail("aluno.menor@soubilingue.com.br");

  // Assinaturas — visão do Asaas, sem gateway ligado ainda.
  const { error: erroAssinaturas } = await supabase.from("assinaturas").insert([
    { aluno_id: alunoAdultoId, plano: "intermediario", status: "ativa", proxima_cobranca: "2026-09-01" },
    { aluno_id: alunoMenorId, plano: "basico", status: "ativa", proxima_cobranca: "2026-09-03" },
  ]);
  if (erroAssinaturas) throw new Error(erroAssinaturas.message);
  console.log("✓ assinaturas");

  // Cupons por escola — § 12.
  const { data: cupons, error: erroCupons } = await supabase
    .from("cupons")
    .insert([
      { nome_escola: "Colégio Nova Era", codigo: "NOVAERA20", desconto_percentual: 20 },
      { nome_escola: "Escola Municipal Vieira", codigo: "VIEIRA15", desconto_percentual: 15 },
    ])
    .select("id, nome_escola");
  if (erroCupons) throw new Error(erroCupons.message);
  console.log("✓ cupons");

  const cupomNovaEra = cupons.find((c) => c.nome_escola === "Colégio Nova Era");

  // Origem dos cadastros — aluno adulto veio do QR do Colégio Nova Era; o
  // menor veio de link direto, sem cupom.
  const { error: erroOrigem } = await supabase.from("cadastros_origem").insert([
    { aluno_id: alunoAdultoId, cupom_id: cupomNovaEra.id, escola_origem: "Colégio Nova Era" },
    { aluno_id: alunoMenorId, cupom_id: null, escola_origem: "sem origem (link direto)" },
  ]);
  if (erroOrigem) throw new Error(erroOrigem.message);
  console.log("✓ cadastros_origem");

  // Parcerias em prospecção — § 08, § 10.
  const { error: erroParcerias } = await supabase.from("parcerias_escolas").insert([
    { nome_escola: "Colégio Nova Era", status: "negociando" },
    { nome_escola: "Escola Municipal Vieira", status: "contatada" },
    { nome_escola: "Instituto Aprender Mais", status: "fechada" },
  ]);
  if (erroParcerias) throw new Error(erroParcerias.message);
  console.log("✓ parcerias_escolas");
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
