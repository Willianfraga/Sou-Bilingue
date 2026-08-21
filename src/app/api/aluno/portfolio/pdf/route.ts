import { getSessao } from "@/lib/auth/guards";
import { getCertificados } from "@/lib/data/certificados";
import { gerarPortfolioPdf } from "@/lib/certificacao/pdf";

export const runtime = "nodejs";

// § 07: portfólio único juntando todos os certificados do aluno logado — só
// para a própria interface do aluno, não do responsável (a conta do
// responsável não é "dona" do acervo, só acompanha).
export async function GET() {
  const sessao = await getSessao();
  if (!sessao) {
    return new Response("Não autenticado.", { status: 401 });
  }
  if (sessao.papel !== "aluno") {
    return new Response("Só a conta do aluno pode baixar o portfólio.", {
      status: 403,
    });
  }

  const certificados = await getCertificados(sessao.userId);
  if (certificados.length === 0) {
    return new Response("Nenhum certificado emitido ainda.", { status: 404 });
  }

  const pdf = await gerarPortfolioPdf({
    nomeAluno: sessao.nome,
    certificados,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="portfolio-certificados.pdf"',
    },
  });
}
