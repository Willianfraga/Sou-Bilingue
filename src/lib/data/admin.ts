import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Assinatura,
  ConteudoPorNivel,
  Cupom,
  OrigemCadastro,
  ParceriaEscola,
  RegistroAuditoriaLgpd,
  RegraDeCertificacao,
} from "@/lib/types";

// Interface do criador é só acompanhamento (§ 03) — todas as consultas aqui
// são leitura, via cliente de sessão (RLS: app.is_admin()). Poucas linhas
// hoje, então N+1 pra pegar nome de aluno é aceitável; revisitar se crescer.

export async function getAssinaturas(): Promise<Assinatura[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assinaturas")
    .select("id, aluno_id, plano, status, proxima_cobranca")
    .order("proxima_cobranca");
  if (error) throw new Error(`Falha ao buscar assinaturas: ${error.message}`);

  const resultado: Assinatura[] = [];
  for (const a of data ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", a.aluno_id)
      .single();
    resultado.push({
      id: a.id,
      alunoNome: profile?.nome ?? "—",
      plano: a.plano,
      status: a.status,
      proximaCobranca: a.proxima_cobranca ?? "—",
    });
  }
  return resultado;
}

export async function getConteudo(): Promise<ConteudoPorNivel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conteudo_por_nivel")
    .select("idioma, nivel, status")
    .order("nivel");
  if (error) throw new Error(`Falha ao buscar conteúdo: ${error.message}`);

  return (data ?? []).map((c) => ({
    idioma: c.idioma,
    nivel: c.nivel,
    status: c.status === "em_curadoria" ? "em curadoria" : "publicado",
  }));
}

export async function getRegrasCertificacao(): Promise<RegraDeCertificacao[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("regras_certificacao")
    .select("plano, nota_minima");
  if (error) throw new Error(`Falha ao buscar regras: ${error.message}`);

  return (data ?? []).map((r) => ({ plano: r.plano, notaMinima: r.nota_minima }));
}

export async function getCupons(): Promise<Cupom[]> {
  const supabase = await createSupabaseServerClient();
  const { data: cupons, error } = await supabase
    .from("cupons")
    .select("id, nome_escola, desconto_percentual");
  if (error) throw new Error(`Falha ao buscar cupons: ${error.message}`);

  const resultado: Cupom[] = [];
  for (const c of cupons ?? []) {
    const { count } = await supabase
      .from("cadastros_origem")
      .select("*", { count: "exact", head: true })
      .eq("cupom_id", c.id);
    resultado.push({
      id: c.id,
      nomeEscola: c.nome_escola,
      descontoPercentual: c.desconto_percentual,
      usos: count ?? 0,
    });
  }
  return resultado;
}

export async function getOrigemCadastros(): Promise<OrigemCadastro[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cadastros_origem")
    .select("aluno_id, escola_origem, cupom_id, cadastrado_em")
    .order("cadastrado_em", { ascending: false });
  if (error) throw new Error(`Falha ao buscar origem: ${error.message}`);

  const resultado: OrigemCadastro[] = [];
  for (const o of data ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", o.aluno_id)
      .single();
    resultado.push({
      id: o.aluno_id,
      alunoNome: profile?.nome ?? "—",
      escolaOrigem: o.escola_origem,
      cupomUsado: o.cupom_id,
      cadastradoEm: o.cadastrado_em.slice(0, 10),
    });
  }
  return resultado;
}

export async function getAuditoriaLgpd(): Promise<RegistroAuditoriaLgpd[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("consentimentos_lgpd")
    .select("id, aluno_id, responsavel_id, consentido_em, revogado_em")
    .order("consentido_em", { ascending: false });
  if (error) throw new Error(`Falha ao buscar auditoria: ${error.message}`);

  const resultado: RegistroAuditoriaLgpd[] = [];
  for (const c of data ?? []) {
    const { data: aluno } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", c.aluno_id)
      .single();
    const { data: responsavel } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", c.responsavel_id)
      .single();
    resultado.push({
      id: c.id,
      responsavelNome: responsavel?.nome ?? "—",
      alunoNome: aluno?.nome ?? "—",
      acao: c.revogado_em ? "Consentimento revogado" : "Consentimento dado",
      dataHora: new Date(c.consentido_em).toLocaleString("pt-BR"),
    });
  }
  return resultado;
}

export async function getParceriasEscolas(): Promise<ParceriaEscola[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parcerias_escolas")
    .select("id, nome_escola, status")
    .order("nome_escola");
  if (error) throw new Error(`Falha ao buscar parcerias: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    nomeEscola: p.nome_escola,
    status: p.status,
  }));
}
