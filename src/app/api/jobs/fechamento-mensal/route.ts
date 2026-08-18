import { fecharMesDeTodosOsAlunos } from "@/lib/certificacao/fechamento";

export const runtime = "nodejs";

// Chamado por cron (ex. Vercel Cron, ou n8n como no academia flow) — nunca
// por uma ação de usuário. § 05: disparo 100% automático, sem ninguém do
// time apertar botão. Protegido por token (CRON_SECRET), não por sessão de
// usuário — por isso fica na lista de caminhos públicos do middleware
// (a própria rota recusa quem não mandar o token certo).
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const { ano, mes } = (await request.json().catch(() => ({}))) as {
    ano?: number;
    mes?: number;
  };

  // Sem ano/mes explícito, fecha o mês corrente — útil pra rodar o job
  // manualmente sem ter que calcular a data. Em produção, o cron real chama
  // isso já passando o mês que acabou de terminar.
  const agora = new Date();
  const anoAlvo = ano ?? agora.getFullYear();
  const mesAlvo = mes ?? agora.getMonth() + 1;

  const resultados = await fecharMesDeTodosOsAlunos(anoAlvo, mesAlvo);

  const resumo = {
    ano: anoAlvo,
    mes: mesAlvo,
    total: resultados.length,
    emitidos: resultados.filter(
      (r) => r.resultado.status === "certificado_emitido",
    ).length,
    jaTinham: resultados.filter(
      (r) => r.resultado.status === "ja_tinha_certificado",
    ).length,
    naoElegiveis: resultados.filter((r) => r.resultado.status === "nao_elegivel")
      .length,
    detalhe: resultados,
  };

  return Response.json(resumo);
}
