import { getSessao } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gerarCertificadoPdf } from "@/lib/certificacao/pdf";

export const runtime = "nodejs";

// § 07: PDF do certificado, gerado na hora a partir do banco — não existe
// arquivo guardado em lugar nenhum, então não tem risco de PDF divergir do
// registro que a página /verificar/[codigo] confere.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await getSessao();
  if (!sessao) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { id } = await params;

  // Cliente de sessão: a policy "aluno/responsável/admin leem os
  // certificados do aluno certo" (app.pode_ver_aluno) decide se esta conta
  // pode ver esta linha — nunca confiamos no id vindo da URL sozinho.
  const supabase = await createSupabaseServerClient();
  const { data: certificado, error } = await supabase
    .from("certificados")
    .select("mes_referencia, idioma, plano, codigo_verificacao, emitido_em, aluno_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return new Response("Falha ao buscar certificado.", { status: 500 });
  }
  if (!certificado) {
    return new Response("Certificado não encontrado.", { status: 404 });
  }

  // Segunda consulta, não embed — a policy de profiles usa a mesma
  // app.pode_ver_aluno(id), então quem já pôde ler o certificado também
  // pode ler o nome (mesmo padrão que corrigiu o bug de RLS do responsável).
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", certificado.aluno_id)
    .maybeSingle();
  const nomeAluno = profile?.nome ?? "Aluno";

  const mesReferencia = new Date(
    `${certificado.mes_referencia}T00:00:00`,
  ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const pdf = await gerarCertificadoPdf({
    nomeAluno,
    certificado: {
      id,
      mesReferencia: mesReferencia.charAt(0).toUpperCase() + mesReferencia.slice(1),
      idioma: certificado.idioma,
      plano: certificado.plano,
      codigoVerificacao: certificado.codigo_verificacao,
      emitidoEm: certificado.emitido_em.slice(0, 10),
    },
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${certificado.codigo_verificacao}.pdf"`,
    },
  });
}
