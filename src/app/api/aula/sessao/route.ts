import { getSessao } from "@/lib/auth/guards";
import { fecharSessaoDeAula } from "@/lib/billing/sessoes-de-aula";

export const runtime = "nodejs";

// Encerramento ao sair da página (navigator.sendBeacon, que não espera
// resposta e não usa server action). Corpo: { sessaoId, segundos }.
export async function POST(request: Request) {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") {
    return Response.json({ erro: "Não autenticado." }, { status: 401 });
  }
  let corpo: { sessaoId?: unknown; segundos?: unknown };
  try {
    corpo = JSON.parse(await request.text());
  } catch {
    return Response.json({ erro: "Corpo inválido." }, { status: 400 });
  }
  if (typeof corpo.sessaoId !== "string") {
    return Response.json({ erro: "Sessão inválida." }, { status: 400 });
  }
  const resultado = await fecharSessaoDeAula(sessao.userId, corpo.sessaoId, Number(corpo.segundos) || 0);
  return Response.json(resultado, { status: resultado.ok ? 200 : 400 });
}
