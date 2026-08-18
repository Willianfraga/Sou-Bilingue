import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Certificado } from "@/lib/types";

function nomeDoMes(dataIso: string): string {
  const [ano, mes] = dataIso.split("-").map(Number);
  const texto = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// § 05: um certificado por mês conquistado. Cliente de sessão — RLS decide
// se quem está logado pode ver os certificados desse aluno.
export async function getCertificados(alunoId: string): Promise<Certificado[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("certificados")
    .select("id, mes_referencia, idioma, plano, codigo_verificacao, emitido_em")
    .eq("aluno_id", alunoId)
    .order("mes_referencia", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar certificados: ${error.message}`);
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    mesReferencia: nomeDoMes(c.mes_referencia),
    idioma: c.idioma,
    plano: c.plano,
    codigoVerificacao: c.codigo_verificacao,
    emitidoEm: c.emitido_em.slice(0, 10),
  }));
}
